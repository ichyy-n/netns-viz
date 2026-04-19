export const CHAIN_OPTIONS = {
  filter: ['INPUT', 'OUTPUT', 'FORWARD'],
  nat: ['PREROUTING', 'POSTROUTING', 'OUTPUT'],
  mangle: ['PREROUTING', 'INPUT', 'OUTPUT', 'FORWARD', 'POSTROUTING'],
  raw: ['PREROUTING', 'OUTPUT']
};
