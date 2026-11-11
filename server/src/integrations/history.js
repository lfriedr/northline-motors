// Vehicle history report adapter (Carfax / AutoCheck).
// Real access needs a dealer account. The mock returns a believable summary
// derived from the VIN so the UI can be built against the real shape.

class MockHistoryProvider {
  name = 'mock';
  async summary(vehicle) {
    const h = [...vehicle.vin].reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      provider: this.name,
      owners: 1 + (h % 3 === 0 ? 1 : 0),
      accidents: h % 7 === 0 ? 1 : 0,
      titleIssues: false,
      serviceRecords: 4 + (h % 9),
      lastOdometer: vehicle.mileage,
      personalUse: h % 5 !== 0,
      // A real integration returns a dealer-branded report link here.
      reportUrl: null,
    };
  }
}

export function getHistoryProvider() {
  return new MockHistoryProvider();
}
