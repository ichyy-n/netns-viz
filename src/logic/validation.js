export const CIDR_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;
export const validateCidr = (ip) => !ip || CIDR_RE.test(ip);
export const CIDR_ERROR_MSG = 'IPアドレスにはCIDR表記（例: /24）を含めてください';
export const validateRouteDestination = (dest) => dest === 'default' || CIDR_RE.test(dest);
export const ROUTE_DEST_ERROR_MSG = '宛先は default またはCIDR表記（例: 192.168.1.0/24）で入力してください';
