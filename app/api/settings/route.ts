import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// Varsayılan ayarlar
const DEFAULT_SETTINGS = {
  codEnabled: true,
  whatsappEnabled: true,
  popupTitle: 'Ödeme Yöntemi Seçin',
  popupDescription: 'Kapıda ödeme veya online ödeme seçeneklerinden birini seçin'
};

// Ayarları oku
async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Dosya yoksa varsayılan ayarları döndür
    return DEFAULT_SETTINGS;
  }
}

// Ayarları kaydet
async function writeSettings(settings: any) {
  try {
    // data klasörünü oluştur
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Klasör zaten varsa hata verme
    }
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Settings write error:', error);
    return false;
  }
}

// GET - Ayarları getir
export async function GET(request: NextRequest) {
  try {
    const settings = await readSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('GET settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Ayarlar yüklenemedi' },
      { status: 500 }
    );
  }
}

// POST - Ayarları kaydet
export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json();
    
    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Ayarlar eksik' },
        { status: 400 }
      );
    }

    const success = await writeSettings(settings);
    
    if (success) {
      return NextResponse.json({ success: true, settings });
    } else {
      return NextResponse.json(
        { success: false, error: 'Ayarlar kaydedilemedi' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('POST settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Ayarlar kaydedilirken hata oluştu' },
      { status: 500 }
    );
  }
}