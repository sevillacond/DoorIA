# Enlace-DoorIA • Procedimento de Compilação em APK Android Nativo (Capacitor)

Este documento descreve o processo passo a passo para empacotar o frontend PWA do **Enlace-DoorIA** em um aplicativo nativo Android (**APK / AAB**) utilizando o **Capacitor 6+** da Ionic Foundation.

---

## 1. Pré-Requisitos do Ambiente de Compilação

Para compilar o APK localmente em sua máquina (Linux, macOS ou Windows):

1. **Node.js**: v18.x ou v20.x LTS + `npm` ou `pnpm`
2. **Java Development Kit (JDK)**: OpenJDK 17 ou 21
3. **Android Studio**: Versão Hedgehog / Iguana / Jellyfish ou superior
4. **Android SDK**:
   - `Android SDK Platform 34` (Android 14) ou superior
   - `Android SDK Build-Tools 34.0.0`
   - `Android SDK Command-line Tools`

---

## 2. Passo a Passo de Instalação do Capacitor

No diretório raiz do projeto Enlace-DoorIA:

```bash
# 1. Instalar as dependências do Capacitor Core e CLI
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/android

# 2. Inicializar a configuração do Capacitor
npx cap init "Enlace-DoorIA" "br.com.enlace.dooria" --web-dir dist

# 3. Adicionar a plataforma Android ao projeto
npx cap add android
```

---

## 3. Configuração do `capacitor.config.ts`

Crie ou edite o arquivo `capacitor.config.ts` na raiz do projeto:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.enlace.dooria',
  appName: 'Enlace-DoorIA',
  webDir: 'dist',
  server: {
    // Permite conexões HTTP na rede local do condomínio (LAN 192.168.1.0/24)
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      '192.168.1.*',
      'localhost',
      '*.enlace.com.br'
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

---

## 4. Permissões Críticas do Android (`AndroidManifest.xml`)

Para que o aplicativo funcione plenamente como **Interfone WebRTC com Áudio Bidirecional e Câmeras RTSP/go2rtc**, adicione as seguintes permissões em `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Conectividade LAN e Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

    <!-- WebPhone / Interfone WebRTC (Microfone e Áudio) -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <!-- Notificações Push e Toque Prioritário -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Leitura de QR Code e Câmeras -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="true" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"> <!-- Permite tráfego HTTP para o servidor da guarita -->

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>
    </application>
</manifest>
```

---

## 5. Script de Build e Sincronização

Adicione os seguintes atalhos ao seu `package.json`:

```json
"scripts": {
  "build:android": "npm run build && npx cap sync android",
  "open:android": "npx cap open android"
}
```

Execute para gerar os artefatos web e sincronizar com o projeto Android:

```bash
npm run build:android
```

---

## 6. Geração do APK Debug e Release (Produção)

### Opção A: Compilação via Linha de Comando (CLI)

#### 1. Gerar APK de Depuração (Debug):
```bash
cd android
./gradlew assembleDebug
# O APK gerado estará em:
# android/app/build/outputs/apk/debug/app-debug.apk
```

#### 2. Gerar APK Assinado de Produção (Release):
1. Gere sua chave de assinatura (Keystore) caso ainda não possua:
```bash
keytool -genkey -v -keystore dooria-release.keystore -alias dooria -keyalg RSA -keysize 2048 -validity 10000
```

2. Compile o APK em modo release:
```bash
./gradlew assembleRelease
```

3. Assine o APK com `apksigner`:
```bash
apksigner sign --ks dooria-release.keystore --out app-release-signed.apk android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Opção B: Compilação pelo Android Studio

1. Abra o projeto no Android Studio:
   ```bash
   npx cap open android
   ```
2. No menu superior, selecione **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
3. Para publicação na Google Play ou distribuição interna corporativa MDM, escolha **Build** → **Generate Signed Bundle / APK**.

---

## 7. Notificações Push no Android com Firebase Cloud Messaging (FCM)

Se o condomínio optar por notificações remotas fora do Wi-Fi:
1. Crie um projeto no Console do Firebase.
2. Adicione o aplicativo Android com pacote `br.com.enlace.dooria`.
3. Baixe o arquivo `google-services.json` e coloque-o em `android/app/google-services.json`.
4. Instale o plugin oficial:
   ```bash
   npm install @capacitor/push-notifications
   npx cap sync android
   ```

---

## 8. Distribuição Direta (Sideload / QR Code do Síndico)

Como o Enlace-DoorIA opera em arquitetura **Local-First**, o condomínio pode hospedar o arquivo `app-release.apk` diretamente no mini-servidor Node.js da guarita:

- URL de Download Local: `http://192.168.1.100:3000/downloads/dooria.apk`
- O síndico pode imprimir um QR Code no mural do condomínio com esse link direto para que novos moradores instalem o app instantaneamente sem passar pela Play Store.
