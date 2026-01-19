/// <reference types="web-bluetooth" />

// Web Bluetooth API type declarations
// These ensure TypeScript recognizes the experimental Web Bluetooth API

// Extend Navigator interface with Bluetooth
interface Navigator {
  bluetooth?: Bluetooth
}

// Bluetooth interface
interface Bluetooth {
  getAvailability(): Promise<boolean>
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>
  getDevices(): Promise<BluetoothDevice[]>
}

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: BluetoothServiceUUID[]
  acceptAllDevices?: boolean
}

interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[]
  name?: string
  namePrefix?: string
}

type BluetoothServiceUUID = string | number

interface BluetoothDevice {
  id: string
  name?: string
  gatt?: BluetoothRemoteGATTServer
  watchAdvertisements(options?: WatchAdvertisementsOptions): Promise<void>
  unwatchAdvertisements(): void
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

interface WatchAdvertisementsOptions {
  signal?: AbortSignal
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothRemoteGATTService {
  device: BluetoothDevice
  uuid: string
  isPrimary: boolean
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>
}

type BluetoothCharacteristicUUID = string | number

interface BluetoothRemoteGATTCharacteristic {
  service: BluetoothRemoteGATTService
  uuid: string
  properties: BluetoothCharacteristicProperties
  value?: DataView
  getDescriptor(descriptor: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor>
  getDescriptors(descriptor?: BluetoothDescriptorUUID): Promise<BluetoothRemoteGATTDescriptor[]>
  readValue(): Promise<DataView>
  writeValue(value: BufferSource): Promise<void>
  writeValueWithResponse(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
  removeEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
}

interface BluetoothCharacteristicProperties {
  broadcast: boolean
  read: boolean
  writeWithoutResponse: boolean
  write: boolean
  notify: boolean
  indicate: boolean
  authenticatedSignedWrites: boolean
  reliableWrite: boolean
  writableAuxiliaries: boolean
}

type BluetoothDescriptorUUID = string | number

interface BluetoothRemoteGATTDescriptor {
  characteristic: BluetoothRemoteGATTCharacteristic
  uuid: string
  value?: DataView
  readValue(): Promise<DataView>
  writeValue(value: BufferSource): Promise<void>
}

// Wake Lock API type declarations
interface Navigator {
  wakeLock?: WakeLock
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>
}

interface WakeLockSentinel {
  released: boolean
  type: 'screen'
  release(): Promise<void>
  addEventListener(type: 'release', listener: (event: Event) => void): void
  removeEventListener(type: 'release', listener: (event: Event) => void): void
}

// Extend Window interface
interface Window {
  speechSynthesis: SpeechSynthesis
}

// Speech Synthesis types (should be built-in but adding for completeness)
interface SpeechSynthesis {
  pending: boolean
  speaking: boolean
  paused: boolean
  onvoiceschanged: ((this: SpeechSynthesis, ev: Event) => any) | null
  getVoices(): SpeechSynthesisVoice[]
  speak(utterance: SpeechSynthesisUtterance): void
  cancel(): void
  pause(): void
  resume(): void
}

interface SpeechSynthesisVoice {
  voiceURI: string
  name: string
  lang: string
  localService: boolean
  default: boolean
}

interface SpeechSynthesisUtterance {
  text: string
  lang: string
  voice: SpeechSynthesisVoice | null
  volume: number
  rate: number
  pitch: number
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => any) | null
  onpause: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null
  onresume: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null
  onmark: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null
  onboundary: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null
}

declare var SpeechSynthesisUtterance: {
  prototype: SpeechSynthesisUtterance
  new(text?: string): SpeechSynthesisUtterance
}

interface SpeechSynthesisEvent extends Event {
  utterance: SpeechSynthesisUtterance
  charIndex: number
  charLength: number
  elapsedTime: number
  name: string
}

interface SpeechSynthesisErrorEvent extends SpeechSynthesisEvent {
  error: SpeechSynthesisErrorCode
}

type SpeechSynthesisErrorCode =
  | 'canceled'
  | 'interrupted'
  | 'audio-busy'
  | 'audio-hardware'
  | 'network'
  | 'synthesis-unavailable'
  | 'synthesis-failed'
  | 'language-unavailable'
  | 'voice-unavailable'
  | 'text-too-long'
  | 'invalid-argument'
  | 'not-allowed'
