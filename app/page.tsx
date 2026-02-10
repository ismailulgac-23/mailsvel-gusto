'use client';

import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  SettingToggle,
  TextContainer,
  Spinner,
} from '@shopify/polaris';
import { translations } from '@/lib/i18n';
import MetaIntegration from '@/components/MetaIntegration';


interface AppSettings {
  codEnabled: boolean;
  whatsappEnabled: boolean;
  popupTitle: string;
  popupDescription: string;
}

export default function Home() {
  const t = translations.tr;

  const [settings, setSettings] = useState<AppSettings>({
    codEnabled: true,
    whatsappEnabled: true,
    popupTitle: 'Ödeme Yöntemi Seçin',
    popupDescription: 'Kapıda ödeme veya online ödeme seçeneklerinden birini seçin'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // İlk yükleme - OAuth kontrolü
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      setIsLoading(true);
      
      // URL'den shop parametresini al
      const urlParams = new URLSearchParams(window.location.search);
      const shop = urlParams.get('shop');

      if (!shop) {
        setError('Shop parametresi bulunamadı. Lütfen uygulamayı Shopify Admin\'den açın.');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Shop kontrolü yapılıyor:', shop);

      // Shop bilgilerini kontrol et
      const shopInfoResponse = await fetch(`/api/shop/info?shop=${shop}`);
      
      if (!shopInfoResponse.ok) {
        // Shop bulunamadı veya yetkilendirilmemiş - OAuth'a yönlendir
        console.log('❌ Shop yetkilendirilmemiş, OAuth başlatılıyor...');
        setIsAuthenticating(true);
        
        // Kısa bir gecikme ile OAuth'a yönlendir
        setTimeout(() => {
          window.location.href = `/api/auth?shop=${shop}`;
        }, 1000);
        return;
      }

      const shopData = await shopInfoResponse.json();
      
      if (!shopData.shopId || !shopData.accessToken) {
        // Access token yok - OAuth'a yönlendir
        console.log('❌ Access token bulunamadı, OAuth başlatılıyor...');
        setIsAuthenticating(true);
        
        setTimeout(() => {
          window.location.href = `/api/auth?shop=${shop}`;
        }, 1000);
        return;
      }

      console.log('✅ Shop yetkilendirilmiş:', shopData.shopDomain);
      setShopId(shopData.shopId);

      // Ayarları yükle
      await loadSettings();
      
    } catch (err: any) {
      console.error('❌ Auth check error:', err);
      setError('Yetkilendirme kontrolü sırasında hata oluştu: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadShopInfo = async () => {
    try {
      const response = await fetch('/api/shop/info');
      if (response.ok) {
        const data = await response.json();
        if (data.shopId) {
          setShopId(data.shopId);
        }
      }
    } catch (err) {
      console.error('Shop info load error:', err);
    }
  };


  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Settings load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error('Ayarlar kaydedilemedi');
      }

      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    } catch (err) {
      setError('Ayarlar kaydedilirken bir hata oluştu');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthenticating) {
    return (
      <Page title="Yetkilendirme">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center'
              }}>
                <Spinner size="large" />
                <div style={{ marginTop: '20px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '10px' }}>
                    🔐 Shopify ile Yetkilendiriliyor...
                  </h2>
                  <p style={{ color: '#6b7280' }}>
                    Lütfen bekleyin, Shopify yetkilendirme sayfasına yönlendiriliyorsunuz.
                  </p>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page title={t.app.title}>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px'
              }}>
                <Spinner size="large" />
                <p style={{ marginTop: '20px', color: '#6b7280' }}>
                  Ayarlar yükleniyor...
                </p>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title={t.app.title}
      subtitle={t.app.subtitle}
    >
      {showBanner && (
        <Banner
          title={t.settings.popup.saved}
          tone="success"
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {error && (
        <Banner
          title={error}
          tone="critical"
          onDismiss={() => setError(null)}
        />
      )}

      <Layout>
        {/* Meta Pixel Entegrasyonu */}
        {shopId && (
          <Layout.Section>
            <MetaIntegration shopId={shopId} />
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
