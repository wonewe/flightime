import type { Airport, Aircraft } from './types'

export const AIRPORTS: Airport[] = [
  { code: 'ICN', city: 'Incheon', cityKo: '인천', country: 'KR', lat: 37.4602, lng: 126.4407 },
  { code: 'GMP', city: 'Gimpo', cityKo: '김포', country: 'KR', lat: 37.5586, lng: 126.7906 },
  { code: 'PUS', city: 'Busan', cityKo: '부산', country: 'KR', lat: 35.1796, lng: 128.9382 },
  { code: 'CJU', city: 'Jeju', cityKo: '제주', country: 'KR', lat: 33.5104, lng: 126.4913 },
  { code: 'HND', city: 'Tokyo Haneda', cityKo: '도쿄 하네다', country: 'JP', lat: 35.5494, lng: 139.7798 },
  { code: 'NRT', city: 'Tokyo Narita', cityKo: '도쿄 나리타', country: 'JP', lat: 35.7720, lng: 140.3929 },
  { code: 'KIX', city: 'Osaka Kansai', cityKo: '오사카', country: 'JP', lat: 34.4320, lng: 135.2304 },
  { code: 'FUK', city: 'Fukuoka', cityKo: '후쿠오카', country: 'JP', lat: 33.5859, lng: 130.4505 },
  { code: 'CTS', city: 'Sapporo', cityKo: '삿포로', country: 'JP', lat: 42.7752, lng: 141.6925 },
  { code: 'BKK', city: 'Bangkok', cityKo: '방콕', country: 'TH', lat: 13.6900, lng: 100.7501 },
  { code: 'SIN', city: 'Singapore', cityKo: '싱가포르', country: 'SG', lat: 1.3644, lng: 103.9915 },
  { code: 'HKG', city: 'Hong Kong', cityKo: '홍콩', country: 'HK', lat: 22.3080, lng: 113.9185 },
  { code: 'TPE', city: 'Taipei', cityKo: '타이베이', country: 'TW', lat: 25.0797, lng: 121.2342 },
  { code: 'PVG', city: 'Shanghai', cityKo: '상하이', country: 'CN', lat: 31.1443, lng: 121.8083 },
  { code: 'LAX', city: 'Los Angeles', cityKo: '로스앤젤레스', country: 'US', lat: 33.9425, lng: -118.4081 },
  { code: 'JFK', city: 'New York', cityKo: '뉴욕', country: 'US', lat: 40.6413, lng: -73.7781 },
  { code: 'SFO', city: 'San Francisco', cityKo: '샌프란시스코', country: 'US', lat: 37.6213, lng: -122.3790 },
  { code: 'CDG', city: 'Paris', cityKo: '파리', country: 'FR', lat: 49.0097, lng: 2.5479 },
  { code: 'LHR', city: 'London', cityKo: '런던', country: 'GB', lat: 51.4700, lng: -0.4543 },
  { code: 'SYD', city: 'Sydney', cityKo: '시드니', country: 'AU', lat: -33.9461, lng: 151.1772 },
]

export const AIRCRAFT: Aircraft[] = [
  { id: 'b737', name: 'Boeing 737-800', nameKo: '보잉 737', type: 'Narrow' },
  { id: 'a320', name: 'Airbus A320neo', nameKo: '에어버스 A320', type: 'Narrow' },
  { id: 'b777', name: 'Boeing 777-300ER', nameKo: '보잉 777', type: 'Wide' },
  { id: 'a350', name: 'Airbus A350-900', nameKo: '에어버스 A350', type: 'Wide' },
  { id: 'b787', name: 'Boeing 787-9', nameKo: '보잉 787', type: 'Wide' },
  { id: 'a380', name: 'Airbus A380', nameKo: '에어버스 A380', type: 'Super' },
]

export const SEAT_OPTIONS = [
  { id: 'window', label: '창가', labelEn: 'Window', seat: 'F' },
  { id: 'middle', label: '가운데', labelEn: 'Middle', seat: 'E' },
  { id: 'aisle', label: '복도', labelEn: 'Aisle', seat: 'C' },
]

export const DURATION_PRESETS = [
  { label: '25분', minutes: 25 },
  { label: '50분', minutes: 50 },
  { label: '90분', minutes: 90 },
  { label: '120분', minutes: 120 },
]

export const PHASE_THRESHOLDS = {
  taxiing: 0,
  cruising: 0.05,
  descending: 0.90,
  landed: 1.0,
}
