//定义一些常量
const PI = Math.PI
const a = 6378245.0 //长半轴
const ee = 0.006693421622965943 //扁率

/**
 * 高德地图坐标转GPS坐标算法(GCJ02 转换为 WGS84)
 * @param lng
 * @param lat
 * @returns {*[]}
 */
export const gcj02towgs84 = (lng: string | number, lat: string | number) => {
  lat = +lat
  lng = +lng
  if (out_of_china(lng, lat)) {
    return [lng, lat]
  } else {
    let dlat = transformlat(lng - 105.0, lat - 35.0)
    let dlng = transformlng(lng - 105.0, lat - 35.0)
    let radlat = (lat / 180.0) * PI
    let magic = Math.sin(radlat)
    magic = 1 - ee * magic * magic
    let sqrtmagic = Math.sqrt(magic)
    dlat = (dlat * 180.0) / (((a * (1 - ee)) / (magic * sqrtmagic)) * PI)
    dlng = (dlng * 180.0) / ((a / sqrtmagic) * Math.cos(radlat) * PI)
    let mglat = lat + dlat
    let mglng = lng + dlng
    return [lng * 2 - mglng, lat * 2 - mglat]
  }
}

/**
 * 判断是否在国内，不在国内则不做偏移
 * @param lng
 * @param lat
 * @returns {boolean}
 */
function out_of_china(lng: string | number, lat: string | number) {
  lat = +lat
  lng = +lng
  // 纬度3.86~53.55,经度73.66~135.05
  return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55)
}

function transformlat(lng: string | number, lat: string | number) {
  lat = +lat
  lng = +lng
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformlng(lng: string | number, lat: string | number) {
  lat = +lat
  lng = +lng
  let ret =
    300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0
  return ret
}
