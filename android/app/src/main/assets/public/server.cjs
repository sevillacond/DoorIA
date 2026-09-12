var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");

// src/services/CameraDiscovery.ts
var MANUFACTURER_PROFILES = {
  Intelbras: {
    name: "Intelbras",
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = "admin", pass = "admin", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=1&subtype=0`,
    subStreamPattern: (ip, user = "admin", pass = "admin", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=1&subtype=1`,
    recommendedProfile: "ONVIF_Profile_T",
    defaultCredentialsHint: "admin / admin ou senha configurada no primeiro boot (ISIC Lite / Intelbras SIM Next)",
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}:
  - ${rtspUrl}
  - ffmpeg:${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}#video=h264#hardware=auto`
  },
  Hikvision: {
    name: "Hikvision",
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = "admin", pass = "admin12345", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/Streaming/Channels/101`,
    subStreamPattern: (ip, user = "admin", pass = "admin12345", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/Streaming/Channels/102`,
    recommendedProfile: "ONVIF_Profile_T",
    defaultCredentialsHint: "admin / senha definida no SADP Tool (Ativa\xE7\xE3o obrigat\xF3ria)",
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}:
  - ${rtspUrl}
  - "exec:ffmpeg -i ${rtspUrl} -c:v copy -f rtsp {output}"`
  },
  Dahua: {
    name: "Dahua",
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = "admin", pass = "admin", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=1&subtype=0`,
    subStreamPattern: (ip, user = "admin", pass = "admin", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=1&subtype=1`,
    recommendedProfile: "ONVIF_Profile_T",
    defaultCredentialsHint: "admin / admin ou senha ConfigTool Dahua",
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}:
  - ${rtspUrl}`
  },
  Axis: {
    name: "Axis",
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = "root", pass = "pass", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/axis-media/media.amp?videocodec=h264`,
    subStreamPattern: (ip, user = "root", pass = "pass", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/axis-media/media.amp?videocodec=h264&resolution=640x360`,
    recommendedProfile: "ONVIF_Profile_T",
    defaultCredentialsHint: "root / configurada no AXIS IP Utility",
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}:
  - ${rtspUrl}`
  },
  Uniview: {
    name: "Uniview",
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = "admin", pass = "123456", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/unicast/c1/s0/live`,
    subStreamPattern: (ip, user = "admin", pass = "123456", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/unicast/c1/s1/live`,
    recommendedProfile: "ONVIF_Profile_S",
    defaultCredentialsHint: "admin / 123456 (EZStation UNV)",
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}:
  - ${rtspUrl}`
  },
  "ONVIF Gen\xE9rica": {
    name: "ONVIF Gen\xE9rica",
    defaultOnvifPort: 8899,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = "admin", pass = "admin", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/onvif1`,
    subStreamPattern: (ip, user = "admin", pass = "admin", port = 554) => `rtsp://${user}:${pass}@${ip}:${port}/onvif2`,
    recommendedProfile: "ONVIF_Profile_S",
    defaultCredentialsHint: "admin / admin ou sem senha",
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}:
  - ${rtspUrl}`
  }
};
function parametrizeDiscoveredCamera(raw, existingCameras) {
  let manufacturer = "ONVIF Gen\xE9rica";
  const hint = (raw.manufacturerHint || "").toLowerCase();
  const mac = raw.mac.toUpperCase();
  if (hint.includes("intelbras") || mac.startsWith("00:1A:3F") || mac.startsWith("4C:11:BF") || mac.startsWith("E0:50:8B")) {
    manufacturer = "Intelbras";
  } else if (hint.includes("hikvision") || hint.includes("ezviz") || mac.startsWith("10:12:FB") || mac.startsWith("44:19:B6") || mac.startsWith("C0:56:E3")) {
    manufacturer = "Hikvision";
  } else if (hint.includes("dahua") || mac.startsWith("3C:EF:8C") || mac.startsWith("A0:BD:1D")) {
    manufacturer = "Dahua";
  } else if (hint.includes("axis") || mac.startsWith("00:40:8C") || mac.startsWith("AC:CC:8E")) {
    manufacturer = "Axis";
  } else if (hint.includes("uniview") || hint.includes("unv") || mac.startsWith("34:CD:6D")) {
    manufacturer = "Uniview";
  }
  const profile = MANUFACTURER_PROFILES[manufacturer] || MANUFACTURER_PROFILES["ONVIF Gen\xE9rica"];
  const model = raw.modelHint || `${manufacturer} IP Camera`;
  const onvifPort = raw.port || profile.defaultOnvifPort;
  const rtspPort = profile.defaultRtspPort;
  const isConfigured = existingCameras.some(
    (cam) => cam.ip && cam.ip === raw.ip || cam.rtspUrl.includes(raw.ip)
  );
  const mainRtsp = profile.mainStreamPattern(raw.ip, "admin", "*****", rtspPort);
  const subRtsp = profile.subStreamPattern(raw.ip, "admin", "*****", rtspPort);
  const go2rtcConfig = profile.generateGo2rtcConfig(model, mainRtsp);
  return {
    id: `disc-${raw.ip.replace(/\./g, "-")}`,
    ip: raw.ip,
    mac: raw.mac,
    manufacturer,
    model,
    firmwareVersion: "v2.800.0000000.12.R",
    onvifPort,
    rtspPort,
    httpPort: profile.defaultHttpPort,
    discoveryMethod: raw.discoveryMethod || "WS-Discovery",
    supportedProfiles: [profile.recommendedProfile, "ONVIF_Profile_S"],
    suggestedRtspMain: mainRtsp,
    suggestedRtspSub: subRtsp,
    suggestedGo2rtcConfig: go2rtcConfig,
    isConfigured,
    defaultCredentialsHint: profile.defaultCredentialsHint,
    detectedCodec: "H.264 High Profile / H.265 Smart"
  };
}

// server.ts
var PORT = 3e3;
var DEFAULT_CONDOMINIUM_CONFIG = {
  id: "condo-slz-01",
  name: "Condom\xEDnio Residencial Solar das Palmeiras",
  tradingName: "Solar das Palmeiras Residencial",
  cnpj: "34.891.022/0001-85",
  address: {
    street: "Av. dos Holandeses, Quadra 14",
    number: "250",
    complement: "Torre \xDAnica",
    neighborhood: "Calhau",
    city: "S\xE3o Lu\xEDs",
    state: "MA",
    zipCode: "65071-380"
  },
  unitsCount: 12,
  blocks: ["Bloco A"],
  floorsCount: 3,
  parkingSpotsCount: 18,
  managementPhone: "(98) 3235-9000",
  emergencyPhone: "(98) 98112-9900",
  email: "administracao@solardaspalmeiras.com.br",
  sindico: {
    name: "Henrique Vasconcelos de Alencar",
    document: "482.319.403-12",
    phone: "(98) 98455-2020",
    email: "sindico@solardaspalmeiras.com.br",
    mandateStart: "2025-03-01",
    mandateEnd: "2027-02-28",
    apartment: "304"
  },
  administrator: {
    name: "Enlace Administradora de Condom\xEDnios & Solu\xE7\xF5es Imobili\xE1rias",
    cnpj: "18.420.981/0001-30",
    phone: "(98) 3227-4000",
    email: "contato@enlacegestao.com.br",
    contactPerson: "Dra. Roberta Fontenele"
  },
  operationalSettings: {
    pedestrianGatePulseSeconds: 5,
    vehicleGatePulseSeconds: 15,
    openGateAlertSeconds: 60,
    dtmfPedestrian: "*07",
    dtmfVehicle: "*08",
    silencePeriodStart: "22:00",
    silencePeriodEnd: "08:00",
    packageDeliveryWindowStart: "08:00",
    packageDeliveryWindowEnd: "20:00",
    callTimeoutSeconds: 30,
    autoUraFallback: true,
    localFirstOfflineMode: true,
    requireVisitorPhoto: true
  },
  financialSettings: {
    dueDay: 10,
    standardFee: 480,
    reserveFundPercentage: 10,
    latePenaltyPercentage: 2,
    monthlyInterestPercentage: 1,
    pixKeyType: "cnpj",
    pixKey: "34.891.022/0001-85",
    bankName: "Banco do Brasil (001)",
    bankAgency: "1612-8",
    bankAccount: "48.910-2"
  },
  technicalSettings: {
    localServerIp: "192.168.1.100",
    asteriskVersion: "Asterisk 20.8 LTS Pure (No FreePBX / Vanilla PJSIP)",
    xpeModel: "Intelbras XPE-3115-IP (Firmware v3.2.0)",
    xpeIp: "192.168.1.150",
    iotGateway: "NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet (Local-First)",
    iotGatewayIp: "192.168.1.160",
    subnetRange: "192.168.1.0/24",
    publicDomain: "https://pwa.condominio-solar.com.br",
    stunTurnServer: "stun:stun.l.google.com:19302",
    asteriskWssPort: 8089,
    allowSelfSignedCerts: true,
    localIpRange: "192.168.1.0/24"
  },
  updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
  updatedBy: "Sistema Piloto"
};
var condominiumConfig = JSON.parse(JSON.stringify(DEFAULT_CONDOMINIUM_CONFIG));
var units = [
  {
    id: "u-101",
    number: "101",
    block: "Bloco A",
    floor: 1,
    sipExtension: "101",
    intercomCode: "101",
    ownerName: "Carlos Eduardo Mendes",
    ownerPhone: "(98) 98112-4011",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-101-1",
        unitId: "u-101",
        name: "Carlos Eduardo Mendes",
        document: "512.441.893-20",
        phone: "(98) 98112-4011",
        email: "carlos.mendes@gmail.com",
        isMainContact: true,
        sipDevice: { extension: "101", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-102",
    number: "102",
    block: "Bloco A",
    floor: 1,
    sipExtension: "102",
    intercomCode: "102",
    ownerName: "Mariana Silveira Castro",
    ownerPhone: "(98) 98822-1922",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-102-1",
        unitId: "u-102",
        name: "Mariana Silveira Castro",
        document: "614.992.123-45",
        phone: "(98) 98822-1922",
        email: "mariana.silveira@outlook.com",
        isMainContact: true,
        sipDevice: { extension: "102", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-103",
    number: "103",
    block: "Bloco A",
    floor: 1,
    sipExtension: "103",
    intercomCode: "103",
    ownerName: "Roberto Alencar",
    ownerPhone: "(98) 98401-3310",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-103-1",
        unitId: "u-103",
        name: "Roberto Alencar",
        document: "321.456.789-00",
        phone: "(98) 98401-3310",
        email: "roberto.alencar@empresa.com.br",
        isMainContact: true,
        sipDevice: { extension: "103", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-104",
    number: "104",
    block: "Bloco A",
    floor: 1,
    sipExtension: "104",
    intercomCode: "104",
    ownerName: "Juliana Barbosa",
    ownerPhone: "(98) 99105-8844",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-104-1",
        unitId: "u-104",
        name: "Juliana Barbosa",
        document: "789.123.456-11",
        phone: "(98) 99105-8844",
        email: "juliana.barbosa@gmail.com",
        isMainContact: true,
        sipDevice: { extension: "104", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-201",
    number: "201",
    block: "Bloco A",
    floor: 2,
    sipExtension: "201",
    intercomCode: "201",
    ownerName: "Fernando Henrique Rocha",
    ownerPhone: "(98) 98220-4499",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-201-1",
        unitId: "u-201",
        name: "Fernando Henrique Rocha (S\xEDndico)",
        document: "445.109.876-54",
        phone: "(98) 98220-4499",
        email: "sindico.solar@gmail.com",
        isMainContact: true,
        sipDevice: { extension: "201", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-202",
    number: "202",
    block: "Bloco A",
    floor: 2,
    sipExtension: "202",
    intercomCode: "202",
    ownerName: "Camila Vasconcelos",
    ownerPhone: "(98) 98777-1010",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-202-1",
        unitId: "u-202",
        name: "Camila Vasconcelos",
        document: "908.234.567-88",
        phone: "(98) 98777-1010",
        email: "camila.vasconcelos@adv.br",
        isMainContact: true,
        sipDevice: { extension: "202", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-203",
    number: "203",
    block: "Bloco A",
    floor: 2,
    sipExtension: "203",
    intercomCode: "203",
    ownerName: "Marcio Azevedo Lima",
    ownerPhone: "(98) 98150-7766",
    financialStatus: "inadimplente",
    residents: [
      {
        id: "r-203-1",
        unitId: "u-203",
        name: "Marcio Azevedo Lima",
        document: "334.887.654-32",
        phone: "(98) 98150-7766",
        email: "marcio.azevedo@gmail.com",
        isMainContact: true,
        sipDevice: { extension: "203", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-204",
    number: "204",
    block: "Bloco A",
    floor: 2,
    sipExtension: "204",
    intercomCode: "204",
    ownerName: "Tatiana Gusm\xE3o",
    ownerPhone: "(98) 98330-9900",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-204-1",
        unitId: "u-204",
        name: "Tatiana Gusm\xE3o",
        document: "123.654.789-99",
        phone: "(98) 98330-9900",
        email: "tatiana.gusmao@gmail.com",
        isMainContact: true,
        sipDevice: { extension: "204", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-301",
    number: "301",
    block: "Bloco A",
    floor: 3,
    sipExtension: "301",
    intercomCode: "301",
    ownerName: "Rodrigo Fonseca",
    ownerPhone: "(98) 98199-5522",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-301-1",
        unitId: "u-301",
        name: "Rodrigo Fonseca",
        document: "876.543.210-44",
        phone: "(98) 98199-5522",
        email: "rodrigo.fonseca@eng.br",
        isMainContact: true,
        sipDevice: { extension: "301", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-302",
    number: "302",
    block: "Bloco A",
    floor: 3,
    sipExtension: "302",
    intercomCode: "302",
    ownerName: "Beatriz Nogueira",
    ownerPhone: "(98) 98888-2144",
    financialStatus: "em_acordo",
    residents: [
      {
        id: "r-302-1",
        unitId: "u-302",
        name: "Beatriz Nogueira",
        document: "654.987.321-00",
        phone: "(98) 98888-2144",
        email: "beatriz.nogueira@gmail.com",
        isMainContact: true,
        sipDevice: { extension: "302", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-303",
    number: "303",
    block: "Bloco A",
    floor: 3,
    sipExtension: "303",
    intercomCode: "303",
    ownerName: "Gustavo Pinheiro",
    ownerPhone: "(98) 98444-1234",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-303-1",
        unitId: "u-303",
        name: "Gustavo Pinheiro",
        document: "432.109.876-77",
        phone: "(98) 98444-1234",
        email: "gustavo.pinheiro@gmail.com",
        isMainContact: true,
        sipDevice: { extension: "303", registered: true, webrtcSupported: true }
      }
    ]
  },
  {
    id: "u-304",
    number: "304",
    block: "Bloco A",
    floor: 3,
    sipExtension: "304",
    intercomCode: "304",
    ownerName: "Luciana Meireles",
    ownerPhone: "(98) 98111-9988",
    financialStatus: "em_dia",
    residents: [
      {
        id: "r-304-1",
        unitId: "u-304",
        name: "Luciana Meireles",
        document: "210.987.654-88",
        phone: "(98) 98111-9988",
        email: "luciana.meireles@uol.com.br",
        isMainContact: true,
        sipDevice: { extension: "304", registered: true, webrtcSupported: true }
      }
    ]
  }
];
var gates = [
  {
    id: "gate-pedestre",
    name: "Port\xE3o Pedestre Social",
    type: "pedestre",
    dtmfCode: "*07",
    status: "fechado",
    sensorState: "ok",
    relayPin: 17
  },
  {
    id: "gate-garagem",
    name: "Port\xE3o Garagem Veicular",
    type: "garagem",
    dtmfCode: "*08",
    status: "fechado",
    sensorState: "ok",
    relayPin: 27
  }
];
var cameras = [
  {
    id: "cam-01",
    name: "C\xE2mera XPE Portaria Social",
    location: "Portaria Frontal (Integrada ao XPE-3115-IP)",
    profile: "ONVIF_Profile_T",
    rtspUrl: "rtsp://192.168.1.150:554/cam/realmonitor?channel=1&subtype=0",
    webrtcStreamUrl: "/api/v1/cameras/cam-01/stream",
    resolution: "1080p @ 30fps (H.264 Baseline)",
    status: "online",
    isXpeIntegrated: true
  },
  {
    id: "cam-02",
    name: "C\xE2mera Port\xE3o Garagem",
    location: "Acesso Veicular",
    profile: "ONVIF_Profile_T",
    rtspUrl: "rtsp://192.168.1.151:554/live/ch0",
    webrtcStreamUrl: "/api/v1/cameras/cam-02/stream",
    resolution: "1080p @ 30fps",
    status: "online"
  },
  {
    id: "cam-03",
    name: "C\xE2mera Hall dos Elevadores",
    location: "T\xE9rreo / Hall Social",
    profile: "ONVIF_Profile_S",
    rtspUrl: "rtsp://192.168.1.152:554/live/ch0",
    webrtcStreamUrl: "/api/v1/cameras/cam-03/stream",
    resolution: "1080p @ 25fps",
    status: "online"
  },
  {
    id: "cam-04",
    name: "C\xE2mera Espa\xE7o Gourmet & Lazer",
    location: "\xC1rea Comum Coberta",
    profile: "ONVIF_Profile_S",
    rtspUrl: "rtsp://192.168.1.153:554/live/ch0",
    webrtcStreamUrl: "/api/v1/cameras/cam-04/stream",
    resolution: "720p @ 30fps",
    status: "online"
  }
];
var discoveredCamerasPool = [
  parametrizeDiscoveredCamera(
    {
      ip: "192.168.1.150",
      mac: "00:1A:3F:8A:2C:11",
      manufacturerHint: "Intelbras",
      modelHint: "Intelbras XPE 3115-IP (C\xE2mera Integrada)",
      port: 80,
      discoveryMethod: "WS-Discovery"
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: "192.168.1.160",
      mac: "4C:11:BF:12:90:AB",
      manufacturerHint: "Intelbras",
      modelHint: "Intelbras VIP 3230 B (Bullet Full HD G4)",
      port: 80,
      discoveryMethod: "WS-Discovery"
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: "192.168.1.161",
      mac: "10:12:FB:CC:34:9A",
      manufacturerHint: "Hikvision",
      modelHint: "Hikvision DS-2CD2043G2-I (AcuSense 4MP LPR)",
      port: 80,
      discoveryMethod: "WS-Discovery"
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: "192.168.1.162",
      mac: "3C:EF:8C:55:12:33",
      manufacturerHint: "Dahua",
      modelHint: "Dahua IPC-HFW1230S (Starlight 2MP)",
      port: 80,
      discoveryMethod: "SSDP"
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: "192.168.1.163",
      mac: "00:40:8C:77:43:10",
      manufacturerHint: "Axis",
      modelHint: "Axis M1065-L (PIR + Microfone)",
      port: 80,
      discoveryMethod: "WS-Discovery"
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: "192.168.1.164",
      mac: "34:CD:6D:88:99:AA",
      manufacturerHint: "Uniview",
      modelHint: "Uniview IPC2122LR3-PF40M-D",
      port: 80,
      discoveryMethod: "ARP/OUI Scan"
    },
    cameras
  )
];
var vehicles = [
  { id: "v-1", unitId: "u-101", brand: "Toyota", model: "Corolla", plate: "PTA-4A12", color: "Prata", parkingSpot: "Vaga 01" },
  { id: "v-2", unitId: "u-102", brand: "Honda", model: "HR-V", plate: "ROX-8B90", color: "Preto", parkingSpot: "Vaga 02" },
  { id: "v-3", unitId: "u-201", brand: "Jeep", model: "Compass", plate: "SLZ-2C34", color: "Branco", parkingSpot: "Vaga 05" },
  { id: "v-4", unitId: "u-203", brand: "Hyundai", model: "HB20", plate: "NMS-5511", color: "Cinza", parkingSpot: "Vaga 07" },
  { id: "v-5", unitId: "u-301", brand: "Volkswagen", model: "Nivus", plate: "MAO-9J88", color: "Azul", parkingSpot: "Vaga 09" }
];
var visitorInvites = [
  {
    id: "inv-1",
    unitId: "u-101",
    visitorName: "Ana Paula Ferreira (Personal)",
    type: "prestador",
    qrToken: "door_qr_sec_991823a1",
    validFrom: new Date(Date.now() - 36e5).toISOString(),
    validUntil: new Date(Date.now() + 864e5).toISOString(),
    status: "ativo",
    entryCount: 1
  },
  {
    id: "inv-2",
    unitId: "u-201",
    visitorName: "Lucas Lima (Festa de Anivers\xE1rio)",
    type: "visitante",
    qrToken: "door_qr_sec_772199f3",
    validFrom: new Date(Date.now() - 72e5).toISOString(),
    validUntil: new Date(Date.now() + 18e6).toISOString(),
    status: "ativo",
    entryCount: 0
  }
];
var packageDeliveries = [
  {
    id: "pkg-1",
    unitId: "u-101",
    trackingCode: "BR-MELI-882910",
    courier: "Mercado Livre",
    description: "Caixa de encomendas pequenas (Eletr\xF4nico)",
    receivedAt: new Date(Date.now() - 144e5).toISOString(),
    status: "aguardando_retirada",
    pickupCode: "8912"
  },
  {
    id: "pkg-2",
    unitId: "u-201",
    trackingCode: "AMZ-BR-102934",
    courier: "Amazon Log\xEDstica",
    description: "Pacote padr\xE3o (Livros e utilidades)",
    receivedAt: new Date(Date.now() - 864e5).toISOString(),
    status: "entregue",
    pickupCode: "4431",
    pickedUpAt: new Date(Date.now() - 36e5).toISOString()
  },
  {
    id: "pkg-3",
    unitId: "u-203",
    trackingCode: "CORREIOS-QM9911",
    courier: "Correios Sedex",
    description: "Envelope documento com aviso de recebimento",
    receivedAt: new Date(Date.now() - 288e5).toISOString(),
    status: "aguardando_retirada",
    pickupCode: "7230"
  }
];
var lprLogs = [
  {
    id: "lpr-1",
    timestamp: new Date(Date.now() - 18e5).toISOString(),
    plate: "PTA-4A12",
    confidence: 98.6,
    cameraName: "C\xE2mera Port\xE3o Garagem (cam-02)",
    matchedVehicle: vehicles[0],
    matchedUnitNumber: "101",
    action: "ABERTURA_AUTOMATICA",
    reason: "Ve\xEDculo cadastrado na Unidade 101. Vaga 01. Policy Engine liberou acesso."
  },
  {
    id: "lpr-2",
    timestamp: new Date(Date.now() - 72e5).toISOString(),
    plate: "ROX-8B90",
    confidence: 97.4,
    cameraName: "C\xE2mera Port\xE3o Garagem (cam-02)",
    matchedVehicle: vehicles[1],
    matchedUnitNumber: "102",
    action: "ABERTURA_AUTOMATICA",
    reason: "Ve\xEDculo cadastrado na Unidade 102. Vaga 02. Policy Engine liberou acesso."
  },
  {
    id: "lpr-3",
    timestamp: new Date(Date.now() - 144e5).toISOString(),
    plate: "ABC-1234",
    confidence: 94.2,
    cameraName: "C\xE2mera Port\xE3o Garagem (cam-02)",
    action: "NEGADO_DESCONHECIDO",
    reason: "Placa n\xE3o cadastrada no condom\xEDnio Solar das Palmeiras. Acesso retido."
  }
];
var financialBills = [
  // Apto 101 - Em dia
  {
    id: "b-101-09",
    unitId: "u-101",
    unitNumber: "101",
    competencia: "09/2026",
    vencimento: "2026-09-10T23:59:59.000Z",
    valorOriginal: 650,
    diasAtraso: 0,
    multa: 0,
    juros: 0,
    correcao: 0,
    valorTotal: 650,
    status: "pago",
    pagoEm: "2026-09-08T14:32:00.000Z",
    codigoBarras: "23793.38128 60000.123456 12000.650009 1 98760000065000"
  },
  // Apto 201 - Em dia
  {
    id: "b-201-09",
    unitId: "u-201",
    unitNumber: "201",
    competencia: "09/2026",
    vencimento: "2026-09-10T23:59:59.000Z",
    valorOriginal: 650,
    diasAtraso: 0,
    multa: 0,
    juros: 0,
    correcao: 0,
    valorTotal: 650,
    status: "pago",
    pagoEm: "2026-09-09T10:15:00.000Z",
    codigoBarras: "23793.38128 60000.123457 12000.650009 1 98760000065000"
  },
  // Apto 203 - Inadimplente (competências 07/2026 e 08/2026)
  {
    id: "b-203-07",
    unitId: "u-203",
    unitNumber: "203",
    competencia: "07/2026",
    vencimento: "2026-07-10T23:59:59.000Z",
    valorOriginal: 650,
    diasAtraso: 64,
    multa: 13,
    // 2%
    juros: 13.87,
    // 1% ao mês proporcional (64 dias)
    correcao: 3.25,
    valorTotal: 680.12,
    status: "atrasado",
    codigoBarras: "23793.38128 60000.123458 12000.650009 1 98760000068012"
  },
  {
    id: "b-203-08",
    unitId: "u-203",
    unitNumber: "203",
    competencia: "08/2026",
    vencimento: "2026-08-10T23:59:59.000Z",
    valorOriginal: 650,
    diasAtraso: 33,
    multa: 13,
    // 2%
    juros: 7.15,
    // 1% ao mês proporcional (33 dias)
    correcao: 1.8,
    valorTotal: 671.95,
    status: "atrasado",
    codigoBarras: "23793.38128 60000.123459 12000.650009 1 98760000067195"
  },
  {
    id: "b-203-09",
    unitId: "u-203",
    unitNumber: "203",
    competencia: "09/2026",
    vencimento: "2026-09-10T23:59:59.000Z",
    valorOriginal: 650,
    diasAtraso: 2,
    multa: 13,
    juros: 0.43,
    correcao: 0,
    valorTotal: 663.43,
    status: "atrasado",
    codigoBarras: "23793.38128 60000.123460 12000.650009 1 98760000066343"
  },
  // Apto 302 - Em acordo formalizado
  {
    id: "b-302-09",
    unitId: "u-302",
    unitNumber: "302",
    competencia: "09/2026",
    vencimento: "2026-09-15T23:59:59.000Z",
    valorOriginal: 650,
    diasAtraso: 0,
    multa: 0,
    juros: 0,
    correcao: 0,
    valorTotal: 650,
    status: "em_acordo",
    codigoBarras: "23793.38128 60000.123461 12000.650009 1 98760000065000"
  }
];
var agreements = [
  {
    id: "agr-302-1",
    unitId: "u-302",
    unitNumber: "302",
    totalOriginal: 2600,
    totalNegociado: 2400,
    entrada: 600,
    parcelasTotal: 6,
    parcelasPagas: 2,
    valorParcela: 300,
    diaVencimento: 15,
    dataCriacao: "2026-07-01T10:00:00.000Z",
    status: "ativo"
  }
];
var iotDevices = [
  {
    id: "iot-1",
    name: "Ilumina\xE7\xE3o Frontal Portaria",
    type: "iluminacao",
    protocol: "zigbee_3_0",
    gateway: "NovaDigital_HNZ_CB3",
    state: "desligado",
    online: true,
    location: "Acesso Social Externo"
  },
  {
    id: "iot-2",
    name: "Sensor de Presen\xE7a Garagem",
    type: "sensor_presenca",
    protocol: "zigbee_3_0",
    gateway: "NovaDigital_HNZ_CB3",
    state: "sem_movimento",
    batteryLevel: 94,
    online: true,
    location: "Corredor Garagem Veicular"
  },
  {
    id: "iot-3",
    name: "Rel\xE9 Acionamento Port\xE3o Pedestre",
    type: "rele",
    protocol: "ethernet",
    gateway: "NovaDigital_HNZ_CB3",
    state: "desligado",
    online: true,
    location: "Quadro de Automa\xE7\xE3o T\xE9rreo"
  }
];
var automationRules = [
  {
    id: "rule-1",
    name: "Ilumina\xE7\xE3o Noturna em Chamada XPE",
    description: "Quando o bot\xE3o do XPE for pressionado, acender ilumina\xE7\xE3o frontal por 5 minutos.",
    enabled: true,
    triggerEvent: "CALL_STARTED",
    condition: "Hor\xE1rio entre 18:00 e 06:00",
    action: "Ligar Ilumina\xE7\xE3o Frontal Portaria por 300 segundos",
    lastExecutedAt: new Date(Date.now() - 36e5).toISOString()
  },
  {
    id: "rule-2",
    name: "Sensor de Garagem Noturno",
    description: "Se movimento for detectado na garagem ap\xF3s as 19h, acender refletores de apoio.",
    enabled: true,
    triggerEvent: "MOTION_DETECTED",
    condition: "Hor\xE1rio > 19:00",
    action: "Ligar ilumina\xE7\xE3o garagem por 180s",
    lastExecutedAt: new Date(Date.now() - 12e6).toISOString()
  }
];
var eventBusHistory = [
  {
    id: "evt-1",
    timestamp: new Date(Date.now() - 144e5).toISOString(),
    type: "CALL_STARTED",
    source: "xpe_3115_ip",
    payload: { unitNumber: "101", purpose: "entrega" },
    audited: true
  },
  {
    id: "evt-2",
    timestamp: new Date(Date.now() - 1438e4).toISOString(),
    type: "CALL_ANSWERED",
    source: "pjsip_webrtc",
    payload: { unitNumber: "101", endpoint: "WebPhone-101" },
    audited: true
  },
  {
    id: "evt-3",
    timestamp: new Date(Date.now() - 1435e4).toISOString(),
    type: "ACCESS_GRANTED",
    source: "policy_engine",
    payload: { gate: "pedestre", dtmf: "*07", unitNumber: "101" },
    audited: true
  },
  {
    id: "evt-4",
    timestamp: new Date(Date.now() - 14348e3).toISOString(),
    type: "GATE_OPENED",
    source: "gate_controller",
    payload: { gateId: "gate-pedestre", authorizedBy: "Carlos Eduardo Mendes" },
    audited: true
  }
];
var auditLogs = [
  {
    id: "aud-1",
    timestamp: new Date(Date.now() - 1435e4).toISOString(),
    actor: "Carlos Eduardo Mendes (Apto 101)",
    role: "morador",
    action: "ABERTURA_PORTAO_DTMF",
    target: "Port\xE3o Pedestre Social",
    status: "PERMITIDO",
    ipAddress: "192.168.1.101",
    dtmfCommand: "*07",
    details: { callId: "call-sample-1", duration: 32, validatedByPolicyEngine: true }
  },
  {
    id: "aud-2",
    timestamp: new Date(Date.now() - 288e5).toISOString(),
    actor: "Dispositivo Externo IP",
    role: "desconhecido",
    action: "COMANDO_DTMF_SEM_CHAMADA",
    target: "Port\xE3o Garagem Veicular",
    status: "NEGADO",
    reason: "Tentativa de acionamento DTMF fora de sess\xE3o de chamada ativa no Asterisk.",
    ipAddress: "192.168.1.205",
    dtmfCommand: "*08",
    details: { blocked: true, policyViolated: "CALL_ACTIVE_MANDATORY" }
  }
];
var callHistory = [
  {
    id: "call-h-1",
    origin: "xpe_3115_ip",
    unitNumber: "101",
    purpose: "entrega",
    startedAt: new Date(Date.now() - 144e5).toISOString(),
    durationSeconds: 32,
    status: "atendida",
    answeredBy: "Carlos Eduardo Mendes (WebPhone)",
    gateOpened: "Port\xE3o Pedestre Social (*07)",
    hasRecording: true,
    recordingId: "rec-sha256-88ab19c"
  },
  {
    id: "call-h-2",
    origin: "qr_virtual_intercom",
    unitNumber: "201",
    purpose: "visitante",
    startedAt: new Date(Date.now() - 216e5).toISOString(),
    durationSeconds: 45,
    status: "atendida",
    answeredBy: "Fernando Rocha (WebPhone)",
    gateOpened: "Port\xE3o Pedestre Social (*07)",
    hasRecording: true,
    recordingId: "rec-sha256-44ec99a"
  }
];
var activeCall = null;
var PolicyEngine = class {
  static evaluate(req) {
    const { actor, action, resource, context } = req;
    if (action === "ABRIR_PORTAO") {
      if (actor.role === "morador") {
        if (!context.callActive) {
          return { allowed: false, reason: "Pol\xEDtica de Seguran\xE7a: Abertura por morador s\xF3 \xE9 autorizada durante chamada ativa." };
        }
        if (context.activeCallTargetUnit !== actor.unitNumber) {
          return { allowed: false, reason: "Pol\xEDtica de Isolamento: Morador n\xE3o tem permiss\xE3o para abrir port\xE3o para outra unidade." };
        }
        return { allowed: true };
      }
      if (["sindico", "operador", "admin_condominio", "super_admin"].includes(actor.role)) {
        return { allowed: true };
      }
      return { allowed: false, reason: "Papel sem privil\xE9gio de acionamento de port\xE3o." };
    }
    if (action === "VER_GRAVACAO") {
      if (actor.role === "morador") {
        return {
          allowed: false,
          reason: "Viola\xE7\xE3o da Regra de Ouro #10: Morador tem acesso ao hist\xF3rico de logs, mas N\xC3O tem acesso \xE0 m\xEDdia bruta das grava\xE7\xF5es."
        };
      }
      if (["sindico", "admin_condominio", "super_admin"].includes(actor.role)) {
        return { allowed: true };
      }
      return { allowed: false, reason: "Acesso a grava\xE7\xF5es restrito a administradores e auditores." };
    }
    if (action === "CONSULTAR_FINANCEIRO") {
      if (actor.role === "morador") {
        if (resource.targetUnitNumber && resource.targetUnitNumber !== actor.unitNumber) {
          return { allowed: false, reason: "Isolamento de Dados: Moradores s\xF3 podem visualizar informa\xE7\xF5es financeiras de sua pr\xF3pria unidade." };
        }
        return { allowed: true };
      }
      if (["sindico", "admin_condominio", "super_admin"].includes(actor.role)) {
        return { allowed: true };
      }
      return { allowed: false, reason: "Acesso financeiro n\xE3o autorizado." };
    }
    if (action === "ACESSAR_CAMERA") {
      return { allowed: true };
    }
    return { allowed: true };
  }
};
function publishEvent(type, source, payload) {
  const event = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    type,
    source,
    payload,
    audited: true
  };
  eventBusHistory.unshift(event);
  if (eventBusHistory.length > 50) eventBusHistory.pop();
  automationRules.forEach((rule) => {
    if (rule.enabled && rule.triggerEvent === type) {
      rule.lastExecutedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (rule.id === "rule-1") {
        const lamp = iotDevices.find((d) => d.id === "iot-1");
        if (lamp) lamp.state = "ligado";
      }
    }
  });
  return event;
}
function logAudit(actor, role, action, target, status, details, reason, dtmfCommand) {
  const log = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    actor,
    role,
    action,
    target,
    status,
    reason,
    ipAddress: "192.168.1.100",
    dtmfCommand,
    details
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 100) auditLogs.pop();
  return log;
}
var aiClient = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  } catch (err) {
    console.error("[MaIA] Falha na inicializa\xE7\xE3o do GoogleGenAI SDK:", err);
  }
}
var MAIA_SYSTEM_PROMPT = `Voc\xEA \xE9 a MaIA (M\xF3dulo de Automa\xE7\xE3o e Intelig\xEAncia Aut\xF4noma), a intelig\xEAncia operacional do Enlace-DoorIA no condom\xEDnio piloto em S\xE3o Lu\xEDs - MA (12 unidades).
Diretrizes Absolutas:
1. Voc\xEA opera sob estrito RBAC/Policy Engine. Voc\xEA NUNCA executa comandos SQL diretamente nem comanda rel\xE9s sem passar pela valida\xE7\xE3o de permiss\xE3o.
2. Seu tom \xE9 profissional, calmo, preciso, t\xE9cnico e em portugu\xEAs brasileiro.
3. Se o usu\xE1rio for Morador, forne\xE7a informa\xE7\xF5es APENAS sobre a unidade dele.
4. Para abrir port\xF5es, exija sempre confirma\xE7\xE3o expl\xEDcita e verifique se h\xE1 chamada ativa ou perfil de s\xEDndico/operador.
5. Voc\xEA compreende os protocolos: Asterisk PJSIP, Intelbras XPE-3115-IP, DTMF *07 (pedestre) e *08 (garagem), Zigbee NovaDigital HNZ-CB3, c\xE2meras ONVIF Profile T/S.`;
async function executeMaiaPrompt(prompt, user) {
  const executedTools = [];
  if (aiClient && process.env.GEMINI_API_KEY) {
    try {
      const geminiPromise = aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: `${MAIA_SYSTEM_PROMPT}
Usu\xE1rio atual: Nome="${user.name}", Perfil="${user.role}", Unidade="${user.unitNumber || "Geral"}".`,
          temperature: 0.3
        }
      });
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Tempo limite excedido na resposta do modelo remoto")), 8e3)
      );
      const response = await Promise.race([geminiPromise, timeoutPromise]);
      return {
        reply: response.text || "MaIA operacional. Solicita\xE7\xE3o processada com sucesso.",
        toolCallsExecuted: executedTools
      };
    } catch (apiError) {
      console.warn("[MaIA] Falha ou timeout no provedor principal Gemini, ativando Fallback Local-First:", apiError?.message || apiError);
    }
  }
  const lower = prompt.toLowerCase();
  let fallbackReply = "";
  if (lower.includes("unidade") || lower.includes("morador") || lower.includes("apartamento")) {
    const matchedUnit = units.find((u) => lower.includes(u.number));
    if (matchedUnit) {
      if (user.role === "morador" && user.unitNumber !== matchedUnit.number) {
        fallbackReply = `[MaIA Seguran\xE7a] Acesso restrito. Como morador da Unidade ${user.unitNumber}, voc\xEA n\xE3o tem permiss\xE3o para consultar os dados da Unidade ${matchedUnit.number}.`;
      } else {
        fallbackReply = `[MaIA Local] Unidade ${matchedUnit.number} (${matchedUnit.block}): Propriet\xE1rio ${matchedUnit.ownerName}, ramal SIP ${matchedUnit.sipExtension}. Situa\xE7\xE3o financeira: ${matchedUnit.financialStatus.toUpperCase()}.`;
        executedTools.push({
          toolName: "consultar_unidade",
          params: { unitNumber: matchedUnit.number },
          result: { unit: matchedUnit },
          authorized: true
        });
      }
    } else {
      fallbackReply = `[MaIA Local] O Condom\xEDnio Solar das Palmeiras possui 12 unidades distribu\xEDdas no Bloco A (101 a 104, 201 a 204, 301 a 304). Qual unidade deseja consultar?`;
    }
  } else if (lower.includes("inadimpl") || lower.includes("boleto") || lower.includes("financeiro") || lower.includes("contas")) {
    if (user.role === "morador") {
      const myBills = financialBills.filter((b) => b.unitNumber === user.unitNumber);
      const pendentes = myBills.filter((b) => b.status === "atrasado");
      if (pendentes.length > 0) {
        const total = pendentes.reduce((acc, curr) => acc + curr.valorTotal, 0);
        fallbackReply = `[MaIA Financeiro] Unidade ${user.unitNumber}: Constam ${pendentes.length} taxa(s) condominial(is) pendente(s) totalizando R$ ${total.toFixed(2)} (j\xE1 calculado com multa de 2% e juros de 1% a.m.). Deseja simular um acordo de parcelamento?`;
      } else {
        fallbackReply = `[MaIA Financeiro] Unidade ${user.unitNumber}: Suas taxas condominiais est\xE3o 100% em dia! O pr\xF3ximo vencimento \xE9 em 10/10/2026.`;
      }
    } else {
      const atrasadas = financialBills.filter((b) => b.status === "atrasado");
      const total = atrasadas.reduce((acc, curr) => acc + curr.valorTotal, 0);
      fallbackReply = `[MaIA Relat\xF3rio S\xEDndico] O condom\xEDnio registra atualmente R$ ${total.toFixed(2)} em receb\xEDveis em atraso, concentrados principalmente na Unidade 203. A Unidade 302 mant\xE9m um acordo de parcelamento ativo e em dia.`;
    }
  } else if (lower.includes("abrir") || lower.includes("port\xE3o") || lower.includes("garagem") || lower.includes("pedestre")) {
    if (user.role === "morador" && !activeCall) {
      fallbackReply = `[MaIA Policy Engine] Solicita\xE7\xE3o Negada: Conforme o Master PRD (Regra de Ouro #4 e #11), moradores s\xF3 podem abrir port\xF5es via DTMF (*07/*08) ou WebPhone durante uma sess\xE3o de chamada ativa de atendimento.`;
      logAudit(user.name, user.role, "TENTATIVA_ABERTURA_VIA_MAIA_SEM_CHAMADA", "Port\xF5es", "NEGADO", { prompt });
    } else {
      fallbackReply = `[MaIA Portaria] Acionamento de port\xE3o autorizado para o perfil ${user.role}. Comando DTMF *07 (Pedestre) ou *08 (Garagem) validado com sucesso.`;
      executedTools.push({
        toolName: "abrir_portao",
        params: { gate: lower.includes("garagem") ? "garagem" : "pedestre" },
        result: { status: "aberto_por_5_segundos" },
        authorized: true
      });
    }
  } else if (lower.includes("camera") || lower.includes("c\xE2mera") || lower.includes("xpe")) {
    fallbackReply = `[MaIA Monitoramento] Todas as 4 c\xE2meras IP ONVIF (Portaria XPE, Garagem, Hall e Espa\xE7o Gourmet) est\xE3o operando normalmente na LAN local com codec H.264 e perfil Profile T/S.`;
  } else if (lower.includes("asterisk") || lower.includes("status") || lower.includes("rede")) {
    fallbackReply = `[MaIA Infraestrutura] N\xFAcleo Asterisk 20.8 LTS operacional na LAN (192.168.1.100) com PJSIP e WebRTC ativos. Totem Intelbras XPE-3115-IP e Gateway NovaDigital Zigbee 3.0 Ethernet 100% online em modo Local-First.`;
  } else {
    fallbackReply = `[MaIA Aut\xF4noma] Ol\xE1, ${user.name}. Sou a MaIA, intelig\xEAncia operacional do Enlace-DoorIA. Posso auxiliar no atendimento do XPE, consulta de visitantes, encomendas, hist\xF3rico de portaria, status dos port\xF5es e confer\xEAncia de boletos e taxas condominiais. Como posso ajudar?`;
  }
  return {
    reply: fallbackReply,
    toolCallsExecuted: executedTools
  };
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "Enlace-DoorIA",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      pilot: "S\xE3o Lu\xEDs - MA (12 Unidades)"
    });
  });
  let currentSession = {
    id: "user-carlos-101",
    name: "Carlos Eduardo Mendes",
    email: "carlos.mendes@gmail.com",
    role: "morador",
    unitId: "u-101",
    unitNumber: "101",
    mfaEnabled: true
  };
  app.get("/api/v1/auth/me", (req, res) => {
    res.json(currentSession);
  });
  app.post("/api/v1/auth/switch-role", (req, res) => {
    const { role, unitNumber } = req.body;
    if (role === "sindico") {
      currentSession = {
        id: "user-fernando-201",
        name: "Fernando Henrique Rocha (S\xEDndico)",
        email: "sindico.solar@gmail.com",
        role: "sindico",
        unitId: "u-201",
        unitNumber: "201",
        mfaEnabled: true
      };
    } else if (role === "super_admin") {
      currentSession = {
        id: "user-superadmin",
        name: "Engenheiro de Telecom / Super Admin",
        email: "dev.telecom@enlace.ai",
        role: "super_admin",
        mfaEnabled: true
      };
    } else {
      const targetUnit = units.find((u) => u.number === (unitNumber || "101")) || units[0];
      currentSession = {
        id: `user-${targetUnit.number}`,
        name: targetUnit.ownerName,
        email: targetUnit.residents[0]?.email || "morador@gmail.com",
        role: "morador",
        unitId: targetUnit.id,
        unitNumber: targetUnit.number,
        mfaEnabled: true
      };
    }
    logAudit(currentSession.name, currentSession.role, "TROCA_DE_SESSAO_SIMULADA", "Sistema de Autenticacao", "PERMITIDO", {
      newRole: currentSession.role,
      unitNumber: currentSession.unitNumber
    });
    res.json({ success: true, session: currentSession });
  });
  app.get("/api/v1/condominium", (req, res) => {
    res.json({
      ...condominiumConfig,
      pilotLocation: `${condominiumConfig.address.city} - ${condominiumConfig.address.state}, ${condominiumConfig.address.neighborhood}`,
      localServerIp: condominiumConfig.technicalSettings.localServerIp,
      asteriskVersion: condominiumConfig.technicalSettings.asteriskVersion,
      xpeModel: condominiumConfig.technicalSettings.xpeModel,
      iotGateway: condominiumConfig.technicalSettings.iotGateway
    });
  });
  app.put("/api/v1/condominium", import_express.default.json(), (req, res) => {
    if (currentSession.role === "morador") {
      return res.status(403).json({ error: "Permiss\xE3o negada. Apenas administradores e s\xEDndicos podem alterar as configura\xE7\xF5es do condom\xEDnio." });
    }
    const updates = req.body;
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ error: "Payload de atualiza\xE7\xE3o inv\xE1lido." });
    }
    condominiumConfig = {
      ...condominiumConfig,
      name: updates.name || condominiumConfig.name,
      tradingName: updates.tradingName !== void 0 ? updates.tradingName : condominiumConfig.tradingName,
      cnpj: updates.cnpj || condominiumConfig.cnpj,
      unitsCount: Number(updates.unitsCount) || condominiumConfig.unitsCount,
      blocks: Array.isArray(updates.blocks) ? updates.blocks : condominiumConfig.blocks,
      floorsCount: Number(updates.floorsCount) || condominiumConfig.floorsCount,
      parkingSpotsCount: Number(updates.parkingSpotsCount) || condominiumConfig.parkingSpotsCount,
      managementPhone: updates.managementPhone || condominiumConfig.managementPhone,
      emergencyPhone: updates.emergencyPhone || condominiumConfig.emergencyPhone,
      email: updates.email || condominiumConfig.email,
      address: {
        ...condominiumConfig.address,
        ...updates.address || {}
      },
      sindico: {
        ...condominiumConfig.sindico,
        ...updates.sindico || {}
      },
      administrator: {
        ...condominiumConfig.administrator,
        ...updates.administrator || {}
      },
      operationalSettings: {
        ...condominiumConfig.operationalSettings,
        ...updates.operationalSettings || {}
      },
      financialSettings: {
        ...condominiumConfig.financialSettings,
        ...updates.financialSettings || {}
      },
      technicalSettings: {
        ...condominiumConfig.technicalSettings,
        ...updates.technicalSettings || {}
      },
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: `${currentSession.name} (${currentSession.role})`
    };
    logAudit(
      currentSession.name,
      currentSession.role,
      "CONFIGURACOES_CONDOMINIO_ATUALIZADAS",
      condominiumConfig.name,
      "PERMITIDO",
      {
        timestamp: condominiumConfig.updatedAt,
        updatedFields: Object.keys(updates)
      },
      "Par\xE2metros cadastrais e regras operacionais do condom\xEDnio atualizados pelo Administrador"
    );
    publishEvent("CONDOMINIUM_CONFIG_UPDATED", "server.ts", {
      condominiumId: condominiumConfig.id,
      updatedBy: currentSession.name,
      timestamp: condominiumConfig.updatedAt
    });
    res.json({
      success: true,
      data: condominiumConfig,
      message: "Configura\xE7\xF5es e dados do condom\xEDnio salvos com sucesso no servidor local."
    });
  });
  app.post("/api/v1/condominium/reset", (req, res) => {
    if (currentSession.role === "morador") {
      return res.status(403).json({ error: "Permiss\xE3o negada." });
    }
    condominiumConfig = JSON.parse(JSON.stringify(DEFAULT_CONDOMINIUM_CONFIG));
    condominiumConfig.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    condominiumConfig.updatedBy = `${currentSession.name} (Restaura\xE7\xE3o Piloto)`;
    logAudit(
      currentSession.name,
      currentSession.role,
      "RESTAURACAO_PADROES_CONDOMINIO",
      condominiumConfig.name,
      "PERMITIDO",
      { timestamp: condominiumConfig.updatedAt },
      "Configura\xE7\xF5es do condom\xEDnio restauradas para o baseline padr\xE3o do piloto"
    );
    publishEvent("CONDOMINIUM_CONFIG_UPDATED", "server.ts", {
      condominiumId: condominiumConfig.id,
      updatedBy: currentSession.name,
      action: "reset_defaults"
    });
    res.json({
      success: true,
      data: condominiumConfig,
      message: "Configura\xE7\xF5es do condom\xEDnio restauradas com sucesso para os padr\xF5es do Piloto."
    });
  });
  app.post("/api/v1/units/:unitId/residents", import_express.default.json(), (req, res) => {
    const { unitId } = req.params;
    if (currentSession.role === "morador" && currentSession.unitId !== unitId) {
      logAudit(currentSession.name, currentSession.role, "TENTATIVA_ADICAO_MORADOR_TERCEIROS", `Unidade ${unitId}`, "NEGADO", {});
      return res.status(403).json({ error: "Permiss\xE3o negada. Voc\xEA s\xF3 pode gerenciar moradores da sua pr\xF3pria unidade." });
    }
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return res.status(404).json({ error: "Unidade n\xE3o encontrada" });
    if (!req.body.name || !req.body.document || !req.body.phone) {
      return res.status(400).json({ error: "Nome, documento e telefone s\xE3o obrigat\xF3rios." });
    }
    const newResident = {
      id: `r-${unitId}-${Date.now()}`,
      unitId,
      name: req.body.name,
      document: req.body.document,
      phone: req.body.phone,
      email: req.body.email || "",
      isMainContact: req.body.isMainContact || false,
      sipDevice: {
        extension: unit.sipExtension,
        registered: false,
        webrtcSupported: true
      }
    };
    unit.residents.push(newResident);
    logAudit(currentSession.name, currentSession.role, "MORADOR_ADICIONADO", `Unidade ${unit.number} - ${newResident.name}`, "PERMITIDO", {});
    res.json({ success: true, resident: newResident });
  });
  app.delete("/api/v1/units/:unitId/residents/:residentId", (req, res) => {
    const { unitId, residentId } = req.params;
    if (currentSession.role === "morador" && currentSession.unitId !== unitId) {
      logAudit(currentSession.name, currentSession.role, "TENTATIVA_REMOCAO_MORADOR_TERCEIROS", `Unidade ${unitId}`, "NEGADO", {});
      return res.status(403).json({ error: "Permiss\xE3o negada. Voc\xEA s\xF3 pode gerenciar moradores da sua pr\xF3pria unidade." });
    }
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return res.status(404).json({ error: "Unidade n\xE3o encontrada" });
    const initialLength = unit.residents.length;
    unit.residents = unit.residents.filter((r) => r.id !== residentId);
    if (unit.residents.length === initialLength) {
      return res.status(404).json({ error: "Morador n\xE3o encontrado na unidade especificada" });
    }
    logAudit(currentSession.name, currentSession.role, "MORADOR_REMOVIDO", `Unidade ${unit.number} - ID ${residentId}`, "PERMITIDO", {});
    res.json({ success: true });
  });
  app.get("/api/v1/units", (req, res) => {
    res.json(units);
  });
  app.get("/api/v1/calls/active", (req, res) => {
    res.json({ activeCall });
  });
  app.get("/api/v1/calls/history", (req, res) => {
    if (currentSession.role === "morador" && currentSession.unitNumber) {
      const filtered = callHistory.filter((c) => c.unitNumber === currentSession.unitNumber);
      return res.json(filtered);
    }
    res.json(callHistory);
  });
  app.post("/api/v1/calls/xpe/start", (req, res) => {
    const { unitNumber, purpose } = req.body;
    const targetUnit = units.find((u) => u.number === unitNumber) || units[0];
    activeCall = {
      id: `call-xpe-${Date.now()}`,
      origin: "xpe_3115_ip",
      sourceDevice: "Intelbras XPE-3115-IP (192.168.1.150)",
      targetUnitId: targetUnit.id,
      targetUnitNumber: targetUnit.number,
      purpose: purpose || "visitante",
      state: "chamando",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      durationSeconds: 0,
      visitorMedia: {
        hasVideo: true,
        // Câmera integrada do XPE enviando stream
        hasAudio: true,
        videoStreamUri: "/api/v1/cameras/cam-01/stream",
        mediaSessionId: `sess-${import_crypto.default.randomBytes(4).toString("hex")}`
      }
    };
    publishEvent("CALL_STARTED", "xpe_3115_ip", {
      callId: activeCall.id,
      unitNumber: targetUnit.number,
      purpose: activeCall.purpose
    });
    logAudit("Visitante (Totem XPE)", "visitante", "CHAMADA_INICIADA_XPE", `Unidade ${targetUnit.number}`, "PERMITIDO", {
      targetUnit: targetUnit.number,
      purpose: activeCall.purpose
    });
    res.json({ success: true, call: activeCall });
  });
  app.post("/api/v1/calls/qr/start", (req, res) => {
    const { unitNumber, purpose, cameraGranted, microphoneGranted } = req.body;
    if (!cameraGranted || !microphoneGranted) {
      logAudit("Visitante (QR Intercom)", "visitante", "CHAMADA_QR_BLOQUEADA", `Unidade ${unitNumber}`, "NEGADO", {
        reason: "Permiss\xF5es obrigat\xF3rias de m\xEDdia (c\xE2mera ou microfone) foram negadas pelo visitante."
      });
      return res.status(403).json({
        success: false,
        error: "Conforme a Se\xE7\xE3o 10.1 do Master PRD, a chamada para o morador exige permiss\xE3o obrigat\xF3ria de c\xE2mera frontal e microfone."
      });
    }
    const targetUnit = units.find((u) => u.number === unitNumber) || units[0];
    activeCall = {
      id: `call-qr-${Date.now()}`,
      origin: "qr_virtual_intercom",
      sourceDevice: "QR Virtual Intercom WebRTC (Mobile)",
      targetUnitId: targetUnit.id,
      targetUnitNumber: targetUnit.number,
      purpose: purpose || "visitante",
      state: "chamando",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      durationSeconds: 0,
      visitorMedia: {
        hasVideo: true,
        hasAudio: true,
        videoStreamUri: "blob:webrtc-peer-visitor-stream",
        mediaSessionId: `sess-${import_crypto.default.randomBytes(4).toString("hex")}`
      }
    };
    publishEvent("CALL_STARTED", "qr_virtual_intercom", {
      callId: activeCall.id,
      unitNumber: targetUnit.number,
      purpose: activeCall.purpose
    });
    res.json({ success: true, call: activeCall });
  });
  app.post("/api/v1/calls/answer", (req, res) => {
    if (!activeCall) {
      return res.status(404).json({ error: "Nenhuma chamada ativa para atender." });
    }
    activeCall.state = "em_atendimento";
    activeCall.answeredAt = (/* @__PURE__ */ new Date()).toISOString();
    activeCall.answeredByEndpoint = `WebPhone-${currentSession.unitNumber || "Sindico"}`;
    activeCall.recording = {
      recordingId: `rec-${Date.now()}`,
      hashSha256: import_crypto.default.createHash("sha256").update(activeCall.id).digest("hex"),
      duration: 0,
      encrypted: true
    };
    publishEvent("CALL_ANSWERED", "pjsip_webrtc", {
      callId: activeCall.id,
      answeredBy: activeCall.answeredByEndpoint,
      unitNumber: activeCall.targetUnitNumber
    });
    logAudit(currentSession.name, currentSession.role, "CHAMADA_ATENDIDA_WEBPHONE", `Chamada ${activeCall.id}`, "PERMITIDO", {
      unitNumber: activeCall.targetUnitNumber,
      endpoint: activeCall.answeredByEndpoint
    });
    res.json({ success: true, call: activeCall });
  });
  app.post("/api/v1/calls/dtmf", (req, res) => {
    const dtmf = req.body.dtmf || req.body.digit || req.body.code;
    if (!["*07", "*08"].includes(dtmf)) {
      return res.status(400).json({ error: "C\xF3digo DTMF n\xE3o suportado. Utilize *07 (Pedestre) ou *08 (Garagem)." });
    }
    const targetGateType = dtmf === "*07" ? "pedestre" : "garagem";
    const gate = gates.find((g) => g.type === targetGateType);
    const policyResult = PolicyEngine.evaluate({
      actor: {
        id: currentSession.id,
        role: currentSession.role,
        unitNumber: currentSession.unitNumber
      },
      action: "ABRIR_PORTAO",
      resource: {
        target: gate.name,
        dtmfCommand: dtmf
      },
      context: {
        callActive: !!activeCall,
        activeCallTargetUnit: activeCall?.targetUnitNumber
      }
    });
    if (!policyResult.allowed) {
      logAudit(currentSession.name, currentSession.role, "ABERTURA_PORTAO_DTMF", gate.name, "NEGADO", { dtmf }, policyResult.reason, dtmf);
      publishEvent("ACCESS_DENIED", "policy_engine", { gate: targetGateType, dtmf, reason: policyResult.reason });
      return res.status(403).json({ success: false, error: policyResult.reason });
    }
    gate.status = "aberto";
    gate.lastOpenedAt = (/* @__PURE__ */ new Date()).toISOString();
    gate.lastOpenedBy = currentSession.name;
    publishEvent("ACCESS_GRANTED", "policy_engine", { gate: targetGateType, dtmf, authorizedBy: currentSession.name });
    publishEvent("GATE_OPENED", "access_core", { gateId: gate.id, gateName: gate.name, dtmf });
    logAudit(currentSession.name, currentSession.role, "ABERTURA_PORTAO_DTMF", gate.name, "PERMITIDO", { dtmf, relayPin: gate.relayPin }, void 0, dtmf);
    setTimeout(() => {
      gate.status = "fechado";
      publishEvent("DOOR_OPENED", "gate_controller", { gateId: gate.id, status: "fechado_apos_timer" });
    }, 4e3);
    res.json({
      success: true,
      message: `Comando DTMF ${dtmf} aceito pelo Policy Engine. ${gate.name} acionado via Rel\xE9 ${gate.relayPin}.`,
      gate
    });
  });
  app.post("/api/v1/calls/hangup", (req, res) => {
    if (!activeCall) {
      return res.json({ success: true, message: "Nenhuma chamada ativa." });
    }
    const duration = activeCall.answeredAt ? Math.round((Date.now() - new Date(activeCall.answeredAt).getTime()) / 1e3) : 15;
    const logEntry = {
      id: activeCall.id,
      origin: activeCall.origin,
      unitNumber: activeCall.targetUnitNumber,
      purpose: activeCall.purpose || "outro",
      startedAt: activeCall.startedAt,
      durationSeconds: Math.max(duration, 5),
      status: activeCall.answeredAt ? "atendida" : "nao_atendida",
      answeredBy: activeCall.answeredByEndpoint || "Desconhecido",
      hasRecording: !!activeCall.answeredAt,
      recordingId: activeCall.recording?.recordingId
    };
    callHistory.unshift(logEntry);
    publishEvent("CALL_ENDED", "asterisk_core", { callId: activeCall.id, durationSeconds: logEntry.durationSeconds });
    activeCall = null;
    res.json({ success: true, callLog: logEntry });
  });
  app.get("/api/v1/gates", (req, res) => {
    res.json(gates);
  });
  app.post("/api/v1/gates/:id/trigger", (req, res) => {
    const gateId = req.params.id;
    const gate = gates.find((g) => g.id === gateId);
    if (!gate) return res.status(404).json({ error: "Port\xE3o n\xE3o encontrado." });
    const policy = PolicyEngine.evaluate({
      actor: { id: currentSession.id, role: currentSession.role, unitNumber: currentSession.unitNumber },
      action: "ABRIR_PORTAO",
      resource: { target: gate.name },
      context: { callActive: !!activeCall, activeCallTargetUnit: activeCall?.targetUnitNumber }
    });
    if (!policy.allowed) {
      logAudit(currentSession.name, currentSession.role, "ACIONAMENTO_MANUAL_PORTAO", gate.name, "NEGADO", { gateId }, policy.reason);
      return res.status(403).json({ error: policy.reason });
    }
    gate.status = "aberto";
    gate.lastOpenedAt = (/* @__PURE__ */ new Date()).toISOString();
    gate.lastOpenedBy = currentSession.name;
    publishEvent("GATE_OPENED", "manual_trigger", { gateId, openedBy: currentSession.name });
    logAudit(currentSession.name, currentSession.role, "ACIONAMENTO_MANUAL_PORTAO", gate.name, "PERMITIDO", { gateId });
    setTimeout(() => {
      gate.status = "fechado";
    }, 4e3);
    res.json({ success: true, gate });
  });
  app.get("/api/v1/cameras", (req, res) => {
    res.json(cameras);
  });
  app.get("/api/v1/finance/bills", (req, res) => {
    if (currentSession.role === "morador" && currentSession.unitNumber) {
      const myBills = financialBills.filter((b) => b.unitNumber === currentSession.unitNumber);
      return res.json(myBills);
    }
    res.json(financialBills);
  });
  app.get("/api/v1/finance/summary", (req, res) => {
    const totalAtrasadas = financialBills.filter((b) => b.status === "atrasado").reduce((acc, curr) => acc + curr.valorTotal, 0);
    const unidadesInadimplentes = new Set(financialBills.filter((b) => b.status === "atrasado").map((b) => b.unitNumber)).size;
    const summary = {
      saldoAtual: 34250.8,
      recebiveisMes: 7800,
      totalInadimplencia: totalAtrasadas,
      unidadesInadimplentesCount: unidadesInadimplentes,
      proximosVencimentos: 6500,
      contasAPagar: 4120,
      receitaMensalPrevista: 7800,
      // 12 x 650
      despesasMensais: 4950,
      resultadoOperacional: 2850
    };
    res.json(summary);
  });
  app.get("/api/v1/finance/agreements", (req, res) => {
    if (currentSession.role === "morador" && currentSession.unitNumber) {
      return res.json(agreements.filter((a) => a.unitNumber === currentSession.unitNumber));
    }
    res.json(agreements);
  });
  app.get("/api/v1/packages", (req, res) => {
    if (currentSession.role === "morador" && currentSession.unitNumber) {
      const unit = units.find((u) => u.number === currentSession.unitNumber);
      return res.json(packageDeliveries.filter((p) => p.unitId === unit?.id));
    }
    res.json(packageDeliveries);
  });
  app.post("/api/v1/packages", (req, res) => {
    if (currentSession.role === "morador") {
      return res.status(403).json({ error: "Permiss\xE3o negada. Apenas a Portaria pode registrar o recebimento de encomendas." });
    }
    const { unitNumber, courier, trackingCode, description } = req.body;
    if (!unitNumber || !courier || !description) {
      return res.status(400).json({ error: "Dados incompletos. Unidade, transportadora e descri\xE7\xE3o s\xE3o obrigat\xF3rios." });
    }
    const targetUnit = units.find((u) => u.number === unitNumber);
    if (!targetUnit) {
      return res.status(404).json({ error: "Unidade de destino n\xE3o encontrada no cadastro." });
    }
    const pickupCode = Math.floor(1e3 + Math.random() * 9e3).toString();
    const newPackage = {
      id: `pkg-${Date.now()}`,
      unitId: targetUnit.id,
      trackingCode: trackingCode || `REC-${Math.floor(1e5 + Math.random() * 9e5)}`,
      courier,
      description,
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "aguardando_retirada",
      pickupCode
    };
    packageDeliveries.unshift(newPackage);
    publishEvent("PACKAGE_RECEIVED", "portaria_core", {
      packageId: newPackage.id,
      unitNumber: targetUnit.number,
      courier: newPackage.courier,
      pickupCode
    });
    logAudit(currentSession.name, currentSession.role, "ENCOMENDA_RECEBIDA", `Unidade ${targetUnit.number}`, "PERMITIDO", {
      packageId: newPackage.id,
      courier: newPackage.courier,
      trackingCode: newPackage.trackingCode
    });
    res.json({ success: true, package: newPackage });
  });
  app.post("/api/v1/packages/:id/pickup", (req, res) => {
    const { id } = req.params;
    const { pickupCode } = req.body;
    const pkg = packageDeliveries.find((p) => p.id === id);
    if (!pkg) {
      return res.status(404).json({ error: "Encomenda n\xE3o encontrada." });
    }
    if (pkg.status === "entregue") {
      return res.status(400).json({ error: "Esta encomenda j\xE1 foi retirada anteriormente." });
    }
    if (currentSession.role === "morador" && pkg.unitId !== currentSession.unitId) {
      logAudit(currentSession.name, currentSession.role, "TENTATIVA_RETIRADA_UNIDADE_TERCEIROS", `Encomenda ${id}`, "NEGADO", {});
      return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para retirar encomendas de outra unidade." });
    }
    if (pickupCode && pkg.pickupCode !== pickupCode.trim()) {
      logAudit(currentSession.name, currentSession.role, "RETIRADA_ENCOMENDA_PIN_INVALIDO", `Encomenda ${id}`, "NEGADO", {
        attemptedCode: pickupCode
      });
      return res.status(403).json({ error: "C\xF3digo PIN de retirada incorreto." });
    }
    pkg.status = "entregue";
    pkg.pickedUpAt = (/* @__PURE__ */ new Date()).toISOString();
    const targetUnit = units.find((u) => u.id === pkg.unitId);
    logAudit(currentSession.name, currentSession.role, "RETIRADA_ENCOMENDA_CONCLUIDA", `Unidade ${targetUnit?.number || "Geral"}`, "PERMITIDO", {
      packageId: pkg.id,
      pickedUpAt: pkg.pickedUpAt,
      retiradoPor: currentSession.name
    });
    res.json({ success: true, package: pkg });
  });
  app.post("/api/v1/packages/:id/notify", (req, res) => {
    const { id } = req.params;
    const pkg = packageDeliveries.find((p) => p.id === id);
    if (!pkg) return res.status(404).json({ error: "Encomenda n\xE3o encontrada." });
    const targetUnit = units.find((u) => u.id === pkg.unitId);
    publishEvent("PACKAGE_RECEIVED", "portaria_manual_notify", {
      packageId: pkg.id,
      unitNumber: targetUnit?.number,
      courier: pkg.courier,
      pickupCode: pkg.pickupCode
    });
    logAudit(currentSession.name, currentSession.role, "NOTIFICACAO_ENCOMENDA_REENVIADA", `Unidade ${targetUnit?.number}`, "PERMITIDO", {
      packageId: pkg.id
    });
    res.json({ success: true, message: `Morador do Apto ${targetUnit?.number} notificado com sucesso via WebPhone / Interfone.` });
  });
  app.get("/api/v1/visitors/invites", (req, res) => {
    if (currentSession.role === "morador" && currentSession.unitNumber) {
      const unit = units.find((u) => u.number === currentSession.unitNumber);
      return res.json(visitorInvites.filter((v) => v.unitId === unit?.id));
    }
    res.json(visitorInvites);
  });
  app.post("/api/v1/visitors/invites", (req, res) => {
    const { visitorName, type, targetUnitNumber } = req.body;
    if (!visitorName || !type) {
      return res.status(400).json({ error: "Nome do visitante e tipo s\xE3o obrigat\xF3rios." });
    }
    let finalTargetUnitNumber = targetUnitNumber;
    if (currentSession.role === "morador") {
      finalTargetUnitNumber = currentSession.unitNumber;
    } else {
      if (!targetUnitNumber) {
        return res.status(400).json({ error: "N\xFAmero da unidade de destino \xE9 obrigat\xF3rio para este perfil." });
      }
    }
    const unit = units.find((u) => u.number === finalTargetUnitNumber);
    if (!unit) {
      return res.status(404).json({ error: "Unidade de destino n\xE3o encontrada." });
    }
    const newInvite = {
      id: `inv-${Date.now()}`,
      unitId: unit.id,
      visitorName,
      type,
      qrToken: `door_qr_sec_${import_crypto.default.randomBytes(4).toString("hex")}`,
      validFrom: (/* @__PURE__ */ new Date()).toISOString(),
      validUntil: new Date(Date.now() + 864e5).toISOString(),
      // 24h
      status: "ativo",
      entryCount: 0
    };
    visitorInvites.unshift(newInvite);
    logAudit(currentSession.name, currentSession.role, "CRIACAO_CONVITE_QR", `Unidade ${unit.number}`, "PERMITIDO", {
      visitorName,
      qrToken: newInvite.qrToken
    });
    res.json({ success: true, invite: newInvite });
  });
  app.delete("/api/v1/visitors/invites/:id", (req, res) => {
    const { id } = req.params;
    const invite = visitorInvites.find((v) => v.id === id);
    if (!invite) return res.status(404).json({ error: "Convite n\xE3o encontrado." });
    if (currentSession.role === "morador" && invite.unitId !== currentSession.unitId) {
      logAudit(currentSession.name, currentSession.role, "TENTATIVA_EXCLUSAO_CONVITE_TERCEIROS", `Convite ${id}`, "NEGADO", {});
      return res.status(403).json({ error: "Voc\xEA s\xF3 pode excluir convites da sua pr\xF3pria unidade." });
    }
    invite.status = "revogado";
    logAudit(currentSession.name, currentSession.role, "REVOGACAO_CONVITE_QR", `Convite ${id}`, "PERMITIDO", {
      visitorName: invite.visitorName
    });
    res.json({ success: true, invite });
  });
  app.get("/api/v1/vehicles", (req, res) => {
    if (currentSession.role === "morador" && currentSession.unitNumber) {
      const unit = units.find((u) => u.number === currentSession.unitNumber);
      return res.json(vehicles.filter((v) => v.unitId === unit?.id));
    }
    res.json(vehicles);
  });
  app.get("/api/v1/vehicles/lpr-logs", (req, res) => {
    res.json(lprLogs);
  });
  app.post("/api/v1/vehicles/lpr-simulate", (req, res) => {
    const { plate } = req.body;
    if (!plate) return res.status(400).json({ error: "Placa obrigat\xF3ria." });
    const cleanPlate = plate.trim().toUpperCase();
    const matchedVehicle = vehicles.find((v) => v.plate.toUpperCase() === cleanPlate);
    const matchedUnit = matchedVehicle ? units.find((u) => u.id === matchedVehicle.unitId) : void 0;
    const garageGate = gates.find((g) => g.type === "garagem");
    if (matchedVehicle && matchedUnit) {
      const newEntry = {
        id: `lpr-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        plate: cleanPlate,
        confidence: Number((97.5 + Math.random() * 2.4).toFixed(1)),
        cameraName: "C\xE2mera Port\xE3o Garagem (cam-02)",
        matchedVehicle,
        matchedUnitNumber: matchedUnit.number,
        action: "ABERTURA_AUTOMATICA",
        reason: `Placa reconhecida via OCR ONVIF. ${matchedVehicle.brand} ${matchedVehicle.model} (${matchedVehicle.parkingSpot}) - Apto ${matchedUnit.number}. Port\xE3o liberado via DTMF *08.`
      };
      lprLogs.unshift(newEntry);
      if (lprLogs.length > 50) lprLogs.pop();
      garageGate.status = "aberto";
      garageGate.lastOpenedAt = (/* @__PURE__ */ new Date()).toISOString();
      garageGate.lastOpenedBy = `LPR Autom\xE1tico (${cleanPlate})`;
      publishEvent("ACCESS_GRANTED", "lpr_system", {
        plate: cleanPlate,
        unitNumber: matchedUnit.number,
        gate: "garagem",
        dtmf: "*08"
      });
      publishEvent("GATE_OPENED", "lpr_controller", { gateId: garageGate.id, plate: cleanPlate });
      logAudit("Sistema LPR / C\xE2mera Garagem", "sistema", "LPR_ACESSO_AUTORIZADO", `Port\xE3o Garagem`, "PERMITIDO", {
        plate: cleanPlate,
        unitNumber: matchedUnit.number,
        parkingSpot: matchedVehicle.parkingSpot
      }, void 0, "*08");
      setTimeout(() => {
        garageGate.status = "fechado";
        publishEvent("DOOR_OPENED", "gate_controller", { gateId: garageGate.id, status: "fechado_apos_timer" });
      }, 5e3);
      return res.json({
        success: true,
        authorized: true,
        lprEntry: newEntry,
        gate: garageGate
      });
    } else {
      const newEntry = {
        id: `lpr-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        plate: cleanPlate,
        confidence: Number((93 + Math.random() * 5).toFixed(1)),
        cameraName: "C\xE2mera Port\xE3o Garagem (cam-02)",
        action: "NEGADO_DESCONHECIDO",
        reason: `Placa ${cleanPlate} n\xE3o vinculada a nenhuma unidade do condom\xEDnio. Port\xE3o mantido fechado conforme Master PRD.`
      };
      lprLogs.unshift(newEntry);
      if (lprLogs.length > 50) lprLogs.pop();
      publishEvent("ACCESS_DENIED", "lpr_system", {
        plate: cleanPlate,
        reason: "Ve\xEDculo n\xE3o cadastrado na base de dados"
      });
      logAudit("Sistema LPR / C\xE2mera Garagem", "sistema", "LPR_ACESSO_NEGADO", `Port\xE3o Garagem`, "NEGADO", {
        plate: cleanPlate
      });
      return res.json({
        success: false,
        authorized: false,
        lprEntry: newEntry,
        message: `Ve\xEDculo com placa ${cleanPlate} n\xE3o autorizado. Port\xE3o de garagem permaneceu fechado.`
      });
    }
  });
  app.get("/api/v1/iot/devices", (req, res) => {
    res.json(iotDevices);
  });
  app.get("/api/v1/iot/automations", (req, res) => {
    res.json(automationRules);
  });
  app.post("/api/v1/iot/devices/:id/toggle", (req, res) => {
    const dev = iotDevices.find((d) => d.id === req.params.id);
    if (!dev) return res.status(404).json({ error: "Dispositivo IoT n\xE3o encontrado." });
    dev.state = dev.state === "ligado" ? "desligado" : "ligado";
    publishEvent("DOOR_OPENED", "iot_controller", { deviceId: dev.id, newState: dev.state });
    res.json({ success: true, device: dev });
  });
  app.get("/api/v1/audit", (req, res) => {
    if (currentSession.role === "morador") {
      const myLogs = auditLogs.filter((l) => l.actor.includes(currentSession.unitNumber || ""));
      return res.json(myLogs);
    }
    res.json(auditLogs);
  });
  app.get("/api/v1/events", (req, res) => {
    res.json(eventBusHistory);
  });
  app.get("/api/v1/recordings/:id/audit", (req, res) => {
    const recordingId = req.params.id;
    const policy = PolicyEngine.evaluate({
      actor: { id: currentSession.id, role: currentSession.role, unitNumber: currentSession.unitNumber },
      action: "VER_GRAVACAO",
      resource: { target: recordingId },
      context: {}
    });
    if (!policy.allowed) {
      logAudit(
        currentSession.name,
        currentSession.role,
        "ACESSO_GRAVACAO_BLOQUEADO",
        `Grava\xE7\xE3o ${recordingId}`,
        "NEGADO",
        { recordingId },
        policy.reason
      );
      return res.status(403).json({
        success: false,
        error: policy.reason || "Acesso restrito ao s\xEDndico e administradores auditados conforme LGPD."
      });
    }
    const call = callHistory.find((c) => c.recordingId === recordingId || c.id === recordingId) || callHistory[0];
    const auditData = {
      recordingId,
      callId: call.id,
      unitNumber: call.unitNumber,
      origin: call.origin,
      purpose: call.purpose,
      startedAt: call.startedAt,
      durationSeconds: call.durationSeconds,
      hashSha256: import_crypto.default.createHash("sha256").update(`${recordingId}-${call.id}-local-key-2026`).digest("hex"),
      answeredBy: call.answeredBy || "Morador WebPhone",
      transcript: [
        {
          speaker: "maia_ura",
          text: `Portaria Inteligente Solar das Palmeiras. Direcionando chamada para a unidade ${call.unitNumber} (${call.purpose}).`,
          timestamp: "00:02"
        },
        {
          speaker: "visitante",
          text: call.purpose === "entrega" ? "Ol\xE1, entrega para o apartamento 101, por gentileza." : "Boa tarde, vim para uma visita ao morador.",
          timestamp: "00:08"
        },
        {
          speaker: "morador",
          text: "Boa tarde! Pode deixar na eclusa, estou liberando o port\xE3o social pelo interfone.",
          timestamp: "00:15"
        },
        {
          speaker: "maia_ura",
          text: "Comando DTMF *07 recebido. Pol\xEDtica de acesso validada. Port\xE3o Pedestre Social destravado.",
          timestamp: "00:20"
        }
      ],
      aiAuditSummary: {
        sentiment: "pacifico",
        gateOpened: !!call.gateOpened,
        authorizedRule: "POLICY_ENGINE_RULE_04_DTMF_CALL_ACTIVE",
        observations: "Comportamento do visitante dentro dos par\xE2metros normais. Port\xE3o destravado por 4s com retorno autom\xE1tico seguro."
      }
    };
    logAudit(
      currentSession.name,
      currentSession.role,
      "AUDITORIA_GRAVACAO_CONSULTADA",
      `Grava\xE7\xE3o ${recordingId}`,
      "PERMITIDO",
      {
        recordingId,
        hashVerified: auditData.hashSha256
      }
    );
    res.json({ success: true, audit: auditData });
  });
  app.post("/api/v1/panic/trigger", (req, res) => {
    const { reason, location } = req.body;
    const alertEvent = publishEvent("SOS_TRIGGERED", "panic_core", {
      triggeredBy: currentSession.name,
      role: currentSession.role,
      reason: reason || "Alerta de p\xE2nico/emerg\xEAncia acionado na portaria",
      location: location || "Entrada Social / Cal\xE7ada"
    });
    logAudit(
      currentSession.name,
      currentSession.role,
      "ALARME_PANICO_ACIONADO",
      "Portaria Central",
      "ALERTA",
      { reason, location }
    );
    const lamp = iotDevices.find((d) => d.id === "iot-1");
    if (lamp) lamp.state = "ligado";
    res.json({
      success: true,
      message: "Protocolo de Emerg\xEAncia / P\xE2nico Ativado. Registro imut\xE1vel lavrado e s\xEDndico notificado.",
      eventId: alertEvent.id
    });
  });
  app.get("/api/v1/system/status", (req, res) => {
    const status = {
      asterisk: {
        status: "online",
        version: "Asterisk 20.8 LTS Pure (No FreePBX)",
        pjsipEndpoints: 14,
        activeChannels: activeCall ? 2 : 0,
        uptime: "99.98% (42 dias, 8 horas)"
      },
      xpe3115: {
        status: "online",
        ip: "192.168.1.150",
        firmware: "v3.2.0-secure",
        audioCodec: "G.711u / Opus",
        videoCodec: "H.264 Baseline"
      },
      zigbeeGateway: {
        model: "NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet",
        ip: "192.168.1.160",
        status: "online",
        localFirstNoCloud: true,
        devicesConnected: iotDevices.length
      },
      policyEngine: {
        status: "online",
        rulesActive: 28,
        lastDecisionLatencyMs: 2.4
      },
      maiaAiGateway: {
        provider: aiClient ? "Gemini 3.8 Flash" : "Offline URA Mode",
        status: "ready",
        fallbackActive: !aiClient
      },
      localNetwork: {
        isOnline: true,
        localFirstModeActive: true,
        ipRange: "192.168.1.0/24"
      }
    };
    res.json(status);
  });
  app.get("/api/v1/devices/cameras", (req, res) => {
    res.json(cameras);
  });
  app.post("/api/v1/devices/cameras", import_express.default.json(), (req, res) => {
    const newCam = req.body;
    newCam.id = `cam-${Date.now()}`;
    cameras.push(newCam);
    publishEvent("CAMERA_ADDED", "device_manager", { id: newCam.id, name: newCam.name });
    res.json({ success: true, camera: newCam });
  });
  app.delete("/api/v1/devices/cameras/:id", (req, res) => {
    const { id } = req.params;
    cameras = cameras.filter((c) => c.id !== id);
    publishEvent("CAMERA_REMOVED", "device_manager", { id });
    res.json({ success: true, removedId: id });
  });
  app.get("/api/v1/discovery/cameras", (req, res) => {
    const updated = discoveredCamerasPool.map((disc) => ({
      ...disc,
      isConfigured: cameras.some(
        (cam) => cam.ip && cam.ip === disc.ip || cam.rtspUrl.includes(disc.ip)
      )
    }));
    res.json(updated);
  });
  app.post("/api/v1/discovery/scan", import_express.default.json(), async (req, res) => {
    const { subnet = "192.168.1.0/24" } = req.body || {};
    await new Promise((resolve) => setTimeout(resolve, 600));
    const scanResults = discoveredCamerasPool.map((disc) => ({
      ...disc,
      isConfigured: cameras.some(
        (cam) => cam.ip && cam.ip === disc.ip || cam.rtspUrl.includes(disc.ip)
      )
    }));
    publishEvent("DISCOVERY_SCAN_COMPLETED", "network_discovery", {
      subnet,
      foundCount: scanResults.length,
      protocols: ["WS-Discovery (UDP 3702)", "SSDP/UPnP (UDP 1900)", "ARP/OUI Analysis"]
    });
    res.json({
      success: true,
      subnet,
      scanDurationMs: 640,
      protocols: ["WS-Discovery (UDP 3702)", "SSDP/UPnP (UDP 1900)", "ARP/OUI Scan"],
      camerasFound: scanResults.length,
      devices: scanResults
    });
  });
  app.post("/api/v1/discovery/import", import_express.default.json(), (req, res) => {
    const {
      discoveredId,
      customName,
      customLocation,
      username = "admin",
      password = "admin_password",
      selectedProfile,
      useSubStream
    } = req.body;
    const disc = discoveredCamerasPool.find((d) => d.id === discoveredId);
    if (!disc) {
      return res.status(404).json({ error: "C\xE2mera descoberta n\xE3o encontrada." });
    }
    const profile = MANUFACTURER_PROFILES[disc.manufacturer] || MANUFACTURER_PROFILES["ONVIF Gen\xE9rica"];
    const streamBuilder = useSubStream ? profile.subStreamPattern : profile.mainStreamPattern;
    const rtspUrl = streamBuilder(disc.ip, username, password, disc.rtspPort);
    const streamAlias = `cam_${disc.ip.replace(/\./g, "_")}`;
    const newCam = {
      id: `cam-${Date.now()}`,
      name: customName || disc.model,
      location: customLocation || "\xC1rea Comum (Descoberta LAN)",
      profile: selectedProfile || profile.recommendedProfile,
      rtspUrl,
      webrtcStreamUrl: `/streams/webrtc/${streamAlias}`,
      resolution: disc.manufacturer === "Hikvision" ? "2560x1440 @ 30fps" : "1920x1080 @ 30fps",
      status: "online",
      isXpeIntegrated: disc.model.toLowerCase().includes("xpe"),
      manufacturer: disc.manufacturer,
      model: disc.model,
      ip: disc.ip
    };
    cameras.push(newCam);
    publishEvent("CAMERA_PARAMETRIZED_VIA_DISCOVERY", "device_manager", {
      ip: disc.ip,
      manufacturer: disc.manufacturer,
      model: disc.model,
      onvifProfile: newCam.profile,
      rtspGenerated: rtspUrl.replace(password, "*****"),
      go2rtcAlias: streamAlias
    });
    res.json({
      success: true,
      message: `C\xE2mera ${disc.manufacturer} parametrizada e importada com sucesso no go2rtc!`,
      camera: newCam,
      go2rtcConfigSnippet: profile.generateGo2rtcConfig(streamAlias, rtspUrl)
    });
  });
  app.post("/api/v1/discovery/test-stream", import_express.default.json(), async (req, res) => {
    const { ip, manufacturer, username = "admin", password = "password", rtspPort = 554 } = req.body;
    await new Promise((resolve) => setTimeout(resolve, 400));
    res.json({
      success: true,
      ip,
      manufacturer,
      rtspHandshake: "200 OK (OPTIONS, DESCRIBE, SETUP)",
      videoCodec: "H.264 (High Profile, Level 4.1)",
      audioCodec: "G.711u / AAC",
      latencyEstimateMs: 42,
      onvifDeviceServiceAccessible: true
    });
  });
  app.get("/api/v1/devices/iot", (req, res) => {
    res.json(iotDevices);
  });
  app.post("/api/v1/ai/maia", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt obrigat\xF3rio." });
    try {
      const result = await executeMaiaPrompt(prompt, currentSession);
      publishEvent("MAIA_ACTION_EXECUTED", "maia_engine", { promptLength: prompt.length });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Erro no processamento da MaIA.", details: err?.message });
    }
  });
  const pushSubscriptions = [];
  app.post("/api/v1/notifications/subscribe", (req, res) => {
    const { endpoint, userAgent } = req.body;
    pushSubscriptions.push({
      endpoint: endpoint || "browser-native-pwa",
      userAgent: userAgent || "unknown",
      timestamp: Date.now()
    });
    publishEvent("PUSH_SUBSCRIPTION_REGISTERED", "pwa_service_worker", {
      totalSubscribers: pushSubscriptions.length,
      userAgent
    });
    res.json({
      success: true,
      message: "Dispositivo registrado com sucesso no servi\xE7o de Notifica\xE7\xF5es Push da Portaria.",
      totalSubscribers: pushSubscriptions.length
    });
  });
  app.get("/api/v1/notifications/status", (req, res) => {
    res.json({
      activeSubscribers: pushSubscriptions.length,
      channels: ["intercom_calls", "packages", "gates", "sos"],
      serviceWorkerSupport: true
    });
  });
  app.post("/api/v1/notifications/test", (req, res) => {
    const { type } = req.body;
    let title = "\u{1F514} Chamada de Interfone: Portaria Social";
    let body = "Visitante aguardando no XPE 3115-IP (Portaria Externa). Toque para atender.";
    if (type === "package") {
      title = "\u{1F4E6} Encomenda Recebida na Portaria";
      body = "Um novo pacote da Amazon/Mercado Livre foi registrado para seu apartamento.";
    } else if (type === "gate") {
      title = "\u{1F6AA} Abertura de Port\xE3o Registrada";
      body = "Port\xE3o Pedestre Social acionado com sucesso via comando autorizado DTMF (*07).";
    }
    publishEvent("PUSH_NOTIFICATION_DISPATCHED", "push_gateway", {
      type: type || "intercom",
      title,
      subscribersCount: Math.max(1, pushSubscriptions.length)
    });
    res.json({
      success: true,
      title,
      body,
      timestamp: Date.now()
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Enlace-DoorIA] Servidor operacional na porta ${PORT} (0.0.0.0)`);
    console.log(`[Enlace-DoorIA] Piloto S\xE3o Lu\xEDs - MA | 12 Unidades | Asterisk 20+ PJSIP | MaIA AI Gateway`);
  });
}
startServer().catch((err) => {
  console.error("[Enlace-DoorIA] Falha ao iniciar servidor:", err);
});
//# sourceMappingURL=server.cjs.map
