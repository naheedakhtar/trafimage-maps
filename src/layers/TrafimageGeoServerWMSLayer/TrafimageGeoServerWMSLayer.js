import { WMSLayer } from 'mobility-toolbox-js/ol';

class TrafimageGeoServerWMSLayer extends WMSLayer {
  constructor(options = {}) {
    super({
      ...options,
    });
    if (options.zIndex) {
      this.olLayer.setZIndex(options.zIndex);
    }
  }

  setGeoServerWMSUrl(geoServerUrl) {
    this.olLayer.getSource().setUrl(geoServerUrl);
  }
}

export default TrafimageGeoServerWMSLayer;
