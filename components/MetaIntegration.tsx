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
    Box,
    Spinner,
} from '@shopify/polaris';

interface MetaIntegrationProps {
    shopId: string;
}

interface Pixel {
    id: string;
    pixelId?: string; // Kayıtlı pixel için Meta ID
    name: string;
    saved: boolean;
    isActive: boolean;
    hasCAPIToken: boolean;
}

interface Integration {
    id: string;
    businessAccountId: string | null;
    isActive: boolean;
    tokenExpiry?: string;
}

export default function MetaIntegration({ shopId }: MetaIntegrationProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [pixels, setPixels] = useState<Pixel[]>([]);
    const [savedPixels, setSavedPixels] = useState<Pixel[]>([]);
    const [accounts, setAccounts] = useState<{ id: string; name: string; type: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [savingAccount, setSavingAccount] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        checkMetaStatus();

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'META_OAUTH_SUCCESS') {
                setSuccess('Meta hesabı başarıyla bağlandı!');
                setConnecting(false);
                checkMetaStatus(true);
            } else if (event.data.type === 'META_OAUTH_ERROR') {
                setError(event.data.message || 'Meta bağlantısı başarısız oldu');
                setConnecting(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [shopId]);

    const checkMetaStatus = async (forceRefresh = false) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/meta/status?shopId=${shopId}${forceRefresh ? '&refresh=1' : ''}`, {
                cache: 'no-store'
            });
            const data = await response.json();

            if (data.connected) {
                setIsConnected(true);
                setIntegration(data.integration);
                setSavedPixels(data.pixels);

                if (!data.integration.businessAccountId) {
                    await loadBusinesses();
                } else {
                    await loadPixels();
                }
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

    const loadBusinesses = async () => {
        try {
            setLoadingAccounts(true);
            const response = await fetch(`/api/meta/businesses?shopId=${shopId}`, {
                cache: 'no-store'
            });
            const data = await response.json();
            if (data.accounts) {
                setAccounts(data.accounts);
            }
        } catch (err) {
            console.error('İşletme hesapları yükleme hatası:', err);
            setError('İşletme hesapları yüklenemedi');
        } finally {
            setLoadingAccounts(false);
        }
    };

    const loadPixels = async () => {
        try {
            const response = await fetch(`/api/meta/pixels?shopId=${shopId}`, {
                cache: 'no-store'
            });
            const data = await response.json();

            if (data.connected && data.pixels) {
                setPixels(data.pixels);
            } else if (data.needsAccount) {
                await loadBusinesses();
            }
        } catch (err) {
            console.error('Pixel listesi yükleme hatası:', err);
        }
    };

    const handleSelectAccount = async (accountId: string) => {
        try {
            setSavingAccount(true);
            const response = await fetch('/api/meta/businesses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopId, accountId }),
            });

            if (response.ok) {
                setSuccess('Hesap başarıyla seçildi');
                await checkMetaStatus(true);
            } else {
                throw new Error('Hesap seçilemedi');
            }
        } catch (err) {
            setError('Hesap seçilirken hata oluştu');
        } finally {
            setSavingAccount(false);
        }
    };

    const handleConnectMeta = () => {
        setConnecting(true);
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popupFeatures = `width=${width},height=${height},left=${left},top=${top},popup=yes,scrollbars=yes,resizable=yes`;

        const popup = window.open(
            `/api/meta/auth?shopId=${shopId}`,
            'MetaOAuth',
            popupFeatures
        );

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
        if (!confirm('Meta entegrasyonunu kaldırmak istediğinizden emin misiniz?')) return;

        try {
            const response = await fetch(`/api/meta/status?shopId=${shopId}`, { method: 'DELETE' });
            if (response.ok) {
                setSuccess('Meta entegrasyonu kaldırıldı');
                setIsConnected(false);
                setIntegration(null);
                setPixels([]);
                setSavedPixels([]);
                setAccounts([]);
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
                await checkMetaStatus(true);
            } else {
                throw new Error('Pixel kaydedilemedi');
            }
        } catch (err) {
            setError('Pixel kaydedilirken hata oluştu');
        }
    };

    const handleRemovePixel = async (pixelId: string) => {
        if (!confirm('Bu pixel kaydını kaldırmak istediğinizden emin misiniz?')) return;

        try {
            const response = await fetch(`/api/meta/pixels?shopId=${shopId}&pixelId=${pixelId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setSuccess('Pixel kaydı kaldırıldı');
                await checkMetaStatus(true);
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
                        <Text as="span" variant="bodyMd">Meta entegrasyonu kontrol ediliyor...</Text>
                    </InlineStack>
                </Box>
            </Card>
        );
    }

    return (
        <BlockStack gap="400">
            {error && (
                <Banner title="Hata" tone="critical" onDismiss={() => setError(null)}>
                    {error}
                </Banner>
            )}

            {success && (
                <Banner title="Başarılı" tone="success" onDismiss={() => setSuccess(null)}>
                    {success}
                </Banner>
            )}

            <Card>
                <Box padding="400">
                    <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="200">
                                <Text as="h2" variant="headingMd">Meta Entegrasyonu</Text>
                                <Text as="p" variant="bodyMd" tone="subdued">
                                    Meta hesabınızı bağlayın, işletme hesabınızı seçin ve pixellerinizi yönetin.
                                </Text>
                            </BlockStack>

                            {isConnected ? (
                                <InlineStack gap="200">
                                    <Badge tone="success">Bağlı ✓</Badge>
                                    <Button onClick={handleDisconnect} tone="critical">Bağlantıyı Kes</Button>
                                </InlineStack>
                            ) : (
                                <Button variant="primary" onClick={handleConnectMeta} loading={connecting}>
                                    Meta&apos;ya Bağlan
                                </Button>
                            )}
                        </InlineStack>

                        {isConnected && integration?.businessAccountId && (
                            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                                <InlineStack align="space-between" blockAlign="center">
                                    <BlockStack gap="100">
                                        <Text as="p" variant="bodyMd"><strong>Aktif Hesap:</strong> {integration.businessAccountId}</Text>
                                    </BlockStack>
                                    <Button onClick={() => setIntegration({ ...integration, businessAccountId: null })} size="slim">
                                        Hesabı Değiştir
                                    </Button>
                                </InlineStack>
                            </Box>
                        )}
                    </BlockStack>
                </Box>
            </Card>

            {isConnected && !integration?.businessAccountId && (
                <Card>
                    <Box padding="400">
                        <BlockStack gap="400">
                            <Text as="h3" variant="headingMd">İşletme Hesabı Seçin</Text>
                            <Text as="p" variant="bodyMd" tone="subdued">
                                Pixellerini yönetmek istediğiniz Meta Business veya Reklam hesabını seçin.
                            </Text>

                            {loadingAccounts ? (
                                <InlineStack align="center"><Spinner size="small" /></InlineStack>
                            ) : (
                                <ResourceList
                                    resourceName={{ singular: 'hesap', plural: 'hesaplar' }}
                                    items={accounts}
                                    renderItem={(account) => (
                                        <ResourceItem id={account.id} onClick={() => { }}>
                                            <InlineStack align="space-between" blockAlign="center">
                                                <BlockStack gap="100">
                                                    <Text as="p" variant="bodyMd" fontWeight="semibold">{account.name}</Text>
                                                    <Text as="p" variant="bodySm" tone="subdued">ID: {account.id} • {account.type}</Text>
                                                </BlockStack>
                                                <Button
                                                    onClick={() => handleSelectAccount(account.id)}
                                                    loading={savingAccount}
                                                    variant="primary"
                                                >
                                                    Seç
                                                </Button>
                                            </InlineStack>
                                        </ResourceItem>
                                    )}
                                />
                            )}
                        </BlockStack>
                    </Box>
                </Card>
            )}

            {isConnected && integration?.businessAccountId && (
                <>
                    <Card>
                        <Box padding="400">
                            <BlockStack gap="400">
                                <Text as="h3" variant="headingMd">Mevcut Pixel&apos;ler</Text>
                                {pixels.length === 0 ? (
                                    <Text as="p" tone="subdued">Bu hesapta pixel bulunamadı.</Text>
                                ) : (
                                    <ResourceList
                                        resourceName={{ singular: 'pixel', plural: 'pixels' }}
                                        items={pixels}
                                        renderItem={(pixel) => (
                                            <ResourceItem id={pixel.id} onClick={() => { }}>
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <BlockStack gap="100">
                                                        <Text as="p" variant="bodyMd" fontWeight="semibold">{pixel.name}</Text>
                                                        <Text as="p" variant="bodySm" tone="subdued">ID: {pixel.id}</Text>
                                                    </BlockStack>
                                                    <InlineStack gap="200">
                                                        {pixel.saved ? (
                                                            <Button onClick={() => handleRemovePixel(pixel.id)} tone="critical" size="slim">Kaldır</Button>
                                                        ) : (
                                                            <Button onClick={() => handleSavePixel(pixel.id, pixel.name)} variant="primary" size="slim">Kaydet ve Aktif Et</Button>
                                                        )}
                                                    </InlineStack>
                                                </InlineStack>
                                            </ResourceItem>
                                        )}
                                    />
                                )}
                            </BlockStack>
                        </Box>
                    </Card>

                    {savedPixels.length > 0 && (
                        <Card>
                            <Box padding="400">
                                <BlockStack gap="400">
                                    <Text as="h3" variant="headingMd">Kayıtlı ve Aktif Pixel&apos;ler</Text>
                                    <BlockStack gap="200">
                                        {savedPixels.map((pixel) => (
                                            <Box key={pixel.id} padding="300" background="bg-surface-success" borderRadius="200">
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <BlockStack gap="100">
                                                        <Text as="p" variant="bodyMd" fontWeight="semibold">{pixel.name}</Text>
                                                        <Text as="p" variant="bodySm" tone="subdued">ID: {pixel.pixelId || pixel.id}</Text>
                                                    </BlockStack>
                                                    <Badge tone="success">Aktif</Badge>
                                                </InlineStack>
                                            </Box>
                                        ))}
                                    </BlockStack>
                                </BlockStack>
                            </Box>
                        </Card>
                    )}
                </>
            )}
        </BlockStack>
    );
}
