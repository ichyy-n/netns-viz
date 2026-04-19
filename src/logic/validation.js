export const CIDR_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;
export const validateCidr = (ip) => !ip || CIDR_RE.test(ip);
export const CIDR_ERROR_MSG = 'IPアドレスにはCIDR表記（例: /24）を含めてください';
