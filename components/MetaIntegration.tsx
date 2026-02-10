'use client';

import { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Text,
    Banner,
    BlockStack,
    InlineStack,
    Badge,
    ResourceList,
    ResourceItem,
    Icon,
    Box,
    Spinner,
} from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';


interface MetaIntegrationProps {
    shopId: string;
}

interface Pixel {
    id: string;
    name: string;
    saved: boolean;
    isActive: boolean;
    hasCAPIToken: boolean;
}

interface Integration {
    id: string;
    businessAccountId: string;
    isActive: boolean;
    tokenExpiry?: string;
}

export default function MetaIntegration({ shopId }: MetaIntegrationProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [pixels, setPixels] = useState<Pixel[]>([]);
    const [savedPixels, setSavedPixels] = useState<Pixel[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        checkMetaStatus();

        // OAuth callback mesajlarını dinle
        const handleMessage = (event: MessageEvent) => {
            // Güvenlik: sadece kendi origin'den gelen mesajları kabul et
            if (event.origin !== window.location.origin) {
                return;
            }

            if (event.data.type === 'META_OAUTH_SUCCESS') {
                setSuccess('Meta hesabı başarıyla bağlandı!');
                setConnecting(false);
                checkMetaStatus(); // Durumu yenile
            } else if (event.data.type === 'META_OAUTH_ERROR') {
                setError(event.data.message || 'Meta bağlantısı başarısız oldu');
                setConnecting(false);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [shopId]);

    const checkMetaStatus = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/meta/status?shopId=${shopId}`, {
                // Cache yanıtı 5 dakika boyunca
                cache: 'force-cache',
                next: { revalidate: 300 }
            });
            const data = await response.json();

            if (data.connected) {
                setIsConnected(true);
                setIntegration(data.integration);
                setSavedPixels(data.pixels);

                // Pixel listesini de yükle
                await loadPixels();
            } else {
                setIsConnected(false);
            }
        } catch (err) {
            console.error('Meta durum kontrolü hatası:', err);
            setError('Bağlantı durumu kontrol edilemedi');
        } finally {
            setLoading(false);
        }
    };

    const loadPixels = async () => {
        try {
            const response = await fetch(`/api/meta/pixels?shopId=${shopId}`, {
                // Cache yanıtı 5 dakika boyunca
                cache: 'force-cache',
                next: { revalidate: 300 }
            });
            const data = await response.json();

            if (data.connected && data.pixels) {
                setPixels(data.pixels);
            }
        } catch (err) {
            console.error('Pixel listesi yükleme hatası:', err);
        }
    };

    const handleConnectMeta = () => {
        setConnecting(true);

        // Popup pencere özellikleri
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popupFeatures = `width=${width},height=${height},left=${left},top=${top},popup=yes,scrollbars=yes,resizable=yes`;

        // Meta OAuth'u yeni popup penceresinde aç
        const popup = window.open(
            `/api/meta/auth?shopId=${shopId}`,
            'MetaOAuth',
            popupFeatures
        );

        // Popup kapandığında connecting state'i sıfırla
        if (popup) {
            const checkPopup = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopup);
                    setConnecting(false);
                }
            }, 500);
        } else {
            setError('Popup penceresi açılamadı. Lütfen popup engelleyiciyi devre dışı bırakın.');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Meta entegrasyonunu kaldırmak istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const response = await fetch(`/api/meta/status?shopId=${shopId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setSuccess('Meta entegrasyonu kaldırıldı');
                setIsConnected(false);
                setIntegration(null);
                setPixels([]);
                setSavedPixels([]);
            } else {
                throw new Error('Entegrasyon kaldırılamadı');
            }
        } catch (err) {
            setError('Entegrasyon kaldırılırken hata oluştu');
        }
    };

    const handleSavePixel = async (pixelId: string, pixelName: string) => {
        try {
            const response = await fetch('/api/meta/pixels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopId, pixelId, pixelName }),
            });

            if (response.ok) {
                setSuccess('Pixel başarıyla kaydedildi');
                await checkMetaStatus();
            } else {
                throw new Error('Pixel kaydedilemedi');
            }
        } catch (err) {
            setError('Pixel kaydedilirken hata oluştu');
        }
    };

    const handleRemovePixel = async (pixelId: string) => {
        if (!confirm('Bu pixel kaydını kaldırmak istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const response = await fetch(`/api/meta/pixels?shopId=${shopId}&pixelId=${pixelId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setSuccess('Pixel kaydı kaldırıldı');
                await checkMetaStatus();
            } else {
                throw new Error('Pixel silinemedi');
            }
        } catch (err) {
            setError('Pixel silinirken hata oluştu');
        }
    };

    if (loading) {
        return (
            <Card>
                <Box padding="400">
                    <InlineStack align="center">
                        <Spinner size="small" />
                        <Text as="span">Meta entegrasyonu kontrol ediliyor...</Text>
                    </InlineStack>
                </Box>
            </Card>
        );
    }

    return (
        <BlockStack gap="400">
            {error && (
                <Banner
                    title="Hata"
                    tone="critical"
                    onDismiss={() => setError(null)}
                >
                    {error}
                </Banner>
            )}

            {success && (
                <Banner
                    title="Başarılı"
                    tone="success"
                    onDismiss={() => setSuccess(null)}
                >
                    {success}
                </Banner>
            )}

            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="200">
                                <Text as="h2" variant="headingMd">
                                    Meta Pixel Entegrasyonu
                                </Text>
                                <Text as="p" variant="bodyMd" tone="subdued">
                                    Meta (Facebook) hesabınızı bağlayın ve pixel'lerinizi yönetin
                                </Text>
                            </BlockStack>

                            {isConnected ? (
                                <InlineStack gap="200">
                                    <Badge tone="success">Bağlı ✓</Badge>
                                    <Button onClick={handleDisconnect} tone="critical">
                                        Bağlantıyı Kes
                                    </Button>
                                </InlineStack>

                            ) : (
                                <Button
                                    variant="primary"
                                    onClick={handleConnectMeta}
                                    loading={connecting}
                                >
                                    Meta&apos;ya Bağlan
                                </Button>
                            )}
                        </InlineStack>

                        {isConnected && integration && (
                            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                                <BlockStack gap="200">
                                    <Text as="p" variant="bodyMd">
                                        <strong>Business Account ID:</strong> {integration.businessAccountId}
                                    </Text>
                                    {integration.tokenExpiry && (
                                        <Text as="p" variant="bodyMd" tone="subdued">
                                            Token Geçerlilik: {new Date(integration.tokenExpiry).toLocaleDateString('tr-TR')}
                                        </Text>
                                    )}
                                </BlockStack>
                            </Box>
                        )}
                    </BlockStack>
                </Box>
            </Card>

            {isConnected && pixels.length > 0 && (
                <Card>
                    <Box padding="400">
                        <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">
                                Mevcut Pixel&apos;ler
                            </Text>

                            <ResourceList
                                resourceName={{ singular: 'pixel', plural: 'pixels' }}
                                items={pixels}
                                renderItem={(pixel) => {
                                    const { id, name, saved, hasCAPIToken } = pixel;
                                    return (
                                        <ResourceItem
                                            id={id}
                                            name={name}
                                            onClick={() => { }}
                                        >
                                            <InlineStack align="space-between" blockAlign="center">
                                                <BlockStack gap="100">
                                                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                        {name}
                                                    </Text>
                                                    <Text as="p" variant="bodySm" tone="subdued">
                                                        ID: {id}
                                                    </Text>
                                                </BlockStack>

                                                <InlineStack gap="200">
                                                    {saved && (
                                                        <>
                                                            <Badge tone="success">Kayıtlı</Badge>
                                                            {hasCAPIToken && (
                                                                <Badge tone="info">CAPI Token Var</Badge>
                                                            )}
                                                            <Button
                                                                onClick={() => handleRemovePixel(id)}
                                                                tone="critical"
                                                                size="slim"
                                                            >
                                                                Kaldır
                                                            </Button>
                                                        </>
                                                    )}
                                                    {!saved && (
                                                        <Button
                                                            onClick={() => handleSavePixel(id, name)}
                                                            variant="primary"
                                                            size="slim"
                                                        >
                                                            Kaydet
                                                        </Button>
                                                    )}
                                                </InlineStack>
                                            </InlineStack>
                                        </ResourceItem>
                                    );
                                }}
                            />
                        </BlockStack>
                    </Box>
                </Card>
            )}

            {isConnected && savedPixels.length > 0 && (
                <Card>
                    <Box padding="400">
                        <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">
                                Kayıtlı ve Aktif Pixel&apos;ler
                            </Text>

                            <BlockStack gap="200">
                                {savedPixels.map((pixel) => (
                                    <Box
                                        key={pixel.id}
                                        padding="300"
                                        background="bg-surface-success"
                                        borderRadius="200"
                                    >
                                        <InlineStack align="space-between" blockAlign="center">
                                            <BlockStack gap="100">
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                    {pixel.name}
                                                </Text>
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    Pixel ID: {pixel.id}
                                                </Text>
                                            </BlockStack>
                                            <InlineStack gap="200">
                                                {pixel.isActive && <Badge tone="success">Aktif</Badge>}
                                                {pixel.hasCAPIToken && (
                                                    <Badge tone="info">CAPI Yapılandırılmış</Badge>
                                                )}
                                            </InlineStack>
                                        </InlineStack>
                                    </Box>
                                ))}
                            </BlockStack>
                        </BlockStack>
                    </Box>
                </Card>
            )}
        </BlockStack>
    );
}
