import type { Airport, Aircraft } from './types'

export const AIRPORTS: Airport[] = [
  // Korea
  { code: 'ICN', city: 'Incheon', cityKo: '인천', country: 'KR', lat: 37.4602, lng: 126.4407 },
  { code: 'GMP', city: 'Gimpo', cityKo: '김포', country: 'KR', lat: 37.5586, lng: 126.7906 },
  { code: 'PUS', city: 'Busan', cityKo: '부산', country: 'KR', lat: 35.1796, lng: 128.9382 },
  { code: 'CJU', city: 'Jeju', cityKo: '제주', country: 'KR', lat: 33.5104, lng: 126.4913 },
  { code: 'CJJ', city: 'Cheongju', cityKo: '청주', country: 'KR', lat: 36.7166, lng: 127.4991 },
  // Japan
  { code: 'HND', city: 'Tokyo Haneda', cityKo: '도쿄 하네다', country: 'JP', lat: 35.5494, lng: 139.7798 },
  { code: 'NRT', city: 'Tokyo Narita', cityKo: '도쿄 나리타', country: 'JP', lat: 35.7720, lng: 140.3929 },
  { code: 'KIX', city: 'Osaka Kansai', cityKo: '오사카', country: 'JP', lat: 34.4320, lng: 135.2304 },
  { code: 'FUK', city: 'Fukuoka', cityKo: '후쿠오카', country: 'JP', lat: 33.5859, lng: 130.4505 },
  { code: 'CTS', city: 'Sapporo', cityKo: '삿포로', country: 'JP', lat: 42.7752, lng: 141.6925 },
  { code: 'NGO', city: 'Nagoya', cityKo: '나고야', country: 'JP', lat: 34.8584, lng: 136.8125 },
  { code: 'OKA', city: 'Okinawa', cityKo: '오키나와', country: 'JP', lat: 26.1958, lng: 127.6459 },
  // Southeast Asia
  { code: 'BKK', city: 'Bangkok', cityKo: '방콕', country: 'TH', lat: 13.6900, lng: 100.7501 },
  { code: 'SIN', city: 'Singapore', cityKo: '싱가포르', country: 'SG', lat: 1.3644, lng: 103.9915 },
  { code: 'HKG', city: 'Hong Kong', cityKo: '홍콩', country: 'HK', lat: 22.3080, lng: 113.9185 },
  { code: 'KUL', city: 'Kuala Lumpur', cityKo: '쿠알라룸푸르', country: 'MY', lat: 2.7456, lng: 101.7099 },
  { code: 'MNL', city: 'Manila', cityKo: '마닐라', country: 'PH', lat: 14.5086, lng: 121.0194 },
  { code: 'SGN', city: 'Ho Chi Minh', cityKo: '호치민', country: 'VN', lat: 10.8188, lng: 106.6520 },
  { code: 'HAN', city: 'Hanoi', cityKo: '하노이', country: 'VN', lat: 21.2212, lng: 105.8070 },
  { code: 'DPS', city: 'Bali', cityKo: '발리', country: 'ID', lat: -8.7482, lng: 115.1672 },
  // East Asia
  { code: 'TPE', city: 'Taipei', cityKo: '타이베이', country: 'TW', lat: 25.0797, lng: 121.2342 },
  { code: 'PVG', city: 'Shanghai', cityKo: '상하이', country: 'CN', lat: 31.1443, lng: 121.8083 },
  { code: 'PEK', city: 'Beijing', cityKo: '베이징', country: 'CN', lat: 40.0799, lng: 116.6031 },
  // South Asia
  { code: 'DEL', city: 'New Delhi', cityKo: '뉴델리', country: 'IN', lat: 28.5562, lng: 77.1000 },
  // Middle East
  { code: 'DXB', city: 'Dubai', cityKo: '두바이', country: 'AE', lat: 25.2532, lng: 55.3657 },
  { code: 'DOH', city: 'Doha', cityKo: '도하', country: 'QA', lat: 25.2731, lng: 51.6081 },
  { code: 'IST', city: 'Istanbul', cityKo: '이스탄불', country: 'TR', lat: 41.2753, lng: 28.7519 },
  // Europe
  { code: 'CDG', city: 'Paris', cityKo: '파리', country: 'FR', lat: 49.0097, lng: 2.5479 },
  { code: 'LHR', city: 'London', cityKo: '런던', country: 'GB', lat: 51.4700, lng: -0.4543 },
  { code: 'FRA', city: 'Frankfurt', cityKo: '프랑크푸르트', country: 'DE', lat: 50.0379, lng: 8.5622 },
  { code: 'FCO', city: 'Rome', cityKo: '로마', country: 'IT', lat: 41.8003, lng: 12.2389 },
  { code: 'BCN', city: 'Barcelona', cityKo: '바르셀로나', country: 'ES', lat: 41.2974, lng: 2.0833 },
  { code: 'AMS', city: 'Amsterdam', cityKo: '암스테르담', country: 'NL', lat: 52.3105, lng: 4.7683 },
  // Americas
  { code: 'LAX', city: 'Los Angeles', cityKo: '로스앤젤레스', country: 'US', lat: 33.9425, lng: -118.4081 },
  { code: 'JFK', city: 'New York', cityKo: '뉴욕', country: 'US', lat: 40.6413, lng: -73.7781 },
  { code: 'SFO', city: 'San Francisco', cityKo: '샌프란시스코', country: 'US', lat: 37.6213, lng: -122.3790 },
  { code: 'ORD', city: 'Chicago', cityKo: '시카고', country: 'US', lat: 41.9742, lng: -87.9073 },
  { code: 'SEA', city: 'Seattle', cityKo: '시애틀', country: 'US', lat: 47.4502, lng: -122.3088 },
  { code: 'HNL', city: 'Honolulu', cityKo: '호놀룰루', country: 'US', lat: 21.3187, lng: -157.9224 },
  { code: 'YVR', city: 'Vancouver', cityKo: '밴쿠버', country: 'CA', lat: 49.1967, lng: -123.1815 },
  { code: 'GRU', city: 'São Paulo', cityKo: '상파울루', country: 'BR', lat: -23.4356, lng: -46.4731 },
  // Oceania
  { code: 'SYD', city: 'Sydney', cityKo: '시드니', country: 'AU', lat: -33.9461, lng: 151.1772 },
  { code: 'MEL', city: 'Melbourne', cityKo: '멜버른', country: 'AU', lat: -37.6690, lng: 144.8410 },
  { code: 'AKL', city: 'Auckland', cityKo: '오클랜드', country: 'NZ', lat: -37.0082, lng: 174.7850 },
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
