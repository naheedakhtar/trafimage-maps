import React from 'react';
import PropTypes from 'prop-types';
import Feature from 'ol/Feature';

const propTypes = {
  feature: PropTypes.instanceOf(Feature).isRequired,
};

const CasaRoutePopup = ({ feature }) => {
  const route = feature.get('route');
  const content = (typeof route === 'string' ? JSON.parse(route) : route)
    .popupContent;

  return (
    <div className="wkp-casa-route-popup">
      {Object.keys(content).map(key => (
        <div className="wkp-casa-route-popup-row" key={key}>
          {key}: {content[key]}
        </div>
      ))}
    </div>
  );
};

CasaRoutePopup.propTypes = propTypes;

CasaRoutePopup.renderTitle = feature => {
  let route = feature.get('route');
  route = typeof route === 'string' ? JSON.parse(route) : route;
  return route.popupTitle || 'Informationen';
};

export default CasaRoutePopup;
