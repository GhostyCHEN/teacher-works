/**
 * 设备判断与终端模式管理
 */

/**
 * 判断当前是否应使用移动端模式
 * 1. 若用户在移动端显式点击「切换到电脑端完整后台」，记录 force_desktop === '1'，则返回 false
 * 2. 检测 User-Agent 是否为移动终端（手机 / 平板）
 * 3. 检测当前视口宽度是否 <= 768px
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false
  if (localStorage.getItem('force_desktop') === '1') {
    return false
  }
  const ua = navigator.userAgent || ''
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
  const isSmallScreen = window.innerWidth <= 768
  return isMobileUA || isSmallScreen
}

/**
 * 用户主动切换到电脑后台完整版
 */
export function switchToDesktop() {
  localStorage.setItem('force_desktop', '1')
  window.location.href = '/dashboard'
}

/**
 * 用户主动切换回移动端速记模式
 */
export function switchToMobile() {
  localStorage.removeItem('force_desktop')
  window.location.href = '/mobile'
}
