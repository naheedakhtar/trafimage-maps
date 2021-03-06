import React from 'react';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import MapboxStyleLayer from '../../layers/MapboxStyleLayer';
import Search from '../Search';

const endpoint = 'https://api.geops.io/stops/v1/';

class HandicapStopFinder extends Search {
  constructor() {
    super();
    this.onDataEvent = this.onDataEvent.bind(this);
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  search(value) {
    return fetch(
      `${endpoint}?&q=${encodeURIComponent(value)}&key=${this.apiKey}`,
    )
      .then((data) => data.json())
      .then((featureCollection) => featureCollection.features)
      .catch(() => {
        return [];
      });
  }

  render(item) {
    return <div>{item.properties.name}</div>;
  }

  // eslint-disable-next-line class-methods-use-this
  value(item) {
    return item.properties.name;
  }

  openPopup(item) {
    this.popupItem = item;
    const { layerService } = this.props;
    const layer = layerService.getLayer('ch.sbb.handicap.data');

    if (layer) {
      const { mbMap } = layer;
      if (mbMap.loaded() && mbMap.isStyleLoaded()) {
        this.onDataEvent();
      } else {
        mbMap.once('idle', () => {
          if (mbMap.isSourceLoaded('ch.sbb.handicap')) {
            this.onDataEvent();
          } else {
            // We can't rely on sourcedata because isSourceLoaded returns false.
            mbMap.on('idle', this.onDataEvent);
          }
        });
      }
    }
  }

  onDataEvent() {
    const { layerService, dispatchSetFeatureInfo } = this.props;
    const { mbMap } = layerService.getLayer('ch.sbb.handicap.data');

    if (mbMap.isSourceLoaded('ch.sbb.handicap')) {
      mbMap.off('idle', this.onDataEvent);
    } else {
      return;
    }

    // We get feature infos only for layer that use the source 'ch.sbb.handicap'.
    const infoLayers = layerService.getLayersAsFlatArray().filter((layer) => {
      const { styleLayers } = layer;
      if (!styleLayers) {
        return [];
      }
      const sourceIds = styleLayers.map(({ source }) => source);
      return (
        layer.visible &&
        layer instanceof MapboxStyleLayer &&
        sourceIds.includes('ch.sbb.handicap')
      );
    });

    // Here we simulate a click, it's the best way to get the proper popup informations.
    // The only drawback is that if the station is not rendered there is no popup.
    const infos = infoLayers
      .map((layer) =>
        layer.getFeatureInfoAtCoordinate(
          fromLonLat(this.popupItem.geometry.coordinates),
        ),
      )
      .filter((i) => i);

    Promise.all(infos).then((featInfos) => {
      let featureInfos = featInfos.filter(({ features }) => features.length);
      if (!featureInfos.length) {
        const errorInfo = featInfos.find(
          (l) => l.coordinate && l.layer.get('popupComponent'),
        );
        errorInfo.features = [
          // Create empty feature to open popup with no infos - TRAFHAND-104.
          new Feature({
            geometry: new Point(errorInfo.coordinate),
            stationsbezeichnung: this.popupItem.properties.name,
            noInfo: true,
          }),
        ];
        featureInfos = [errorInfo];
      }
      dispatchSetFeatureInfo(featureInfos);
    });
  }
}

export default HandicapStopFinder;
