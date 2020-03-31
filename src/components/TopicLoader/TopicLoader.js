/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-debugger */
import { MatomoContext } from '@datapunt/matomo-tracker-react';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { compose } from 'lodash/fp';
import LayerService from 'react-spatial/LayerService';
import { setLayers } from '../../model/map/actions';
import {
  setActiveTopic,
  setTopics,
  setFeatureInfo,
  setSearchService,
  fetchPermissionsInfos,
} from '../../model/app/actions';
import SearchService from '../Search/SearchService';
import TopicElements from '../TopicElements';
import { redirect, redirectToLogin } from '../../utils/redirectHelper';

const propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func,
    replace: PropTypes.func,
  }),
  apiKey: PropTypes.string.isRequired,
  topics: PropTypes.arrayOf(PropTypes.shape()).isRequired,

  cartaroUrl: PropTypes.string,
  appBaseUrl: PropTypes.string.isRequired,
  permissionUrl: PropTypes.string,
  vectorTilesKey: PropTypes.string,
  vectorTilesUrl: PropTypes.string,

  // mapStateToProps
  activeTopic: PropTypes.shape(),
  layerService: PropTypes.instanceOf(LayerService).isRequired,
  permissionsInfos: PropTypes.shape({
    user: PropTypes.string,
    permissions: PropTypes.array,
  }),

  // mapDispatchToProps
  dispatchSetActiveTopic: PropTypes.func.isRequired,
  dispatchSetLayers: PropTypes.func.isRequired,
  dispatchSetTopics: PropTypes.func.isRequired,
  dispatchSetFeatureInfo: PropTypes.func.isRequired,
  dispatchSetSearchService: PropTypes.func.isRequired,
  dispatchFetchPermissionsInfos: PropTypes.func.isRequired,

  t: PropTypes.func.isRequired,
};

const defaultProps = {
  history: null,
  activeTopic: null,
  cartaroUrl: null,
  vectorTilesKey: null,
  vectorTilesUrl: null,
  permissionUrl: null,
  permissionsInfos: null,
};

class TopicLoader extends Component {
  componentDidMount() {
    const { dispatchFetchPermissionsInfos, permissionUrl } = this.props;

    if (permissionUrl) {
      dispatchFetchPermissionsInfos(permissionUrl);
    } else {
      console.log('loadTopics without permission');
      this.loadTopics();
    }
  }

  componentDidUpdate(prevProps) {
    const {
      activeTopic,
      topics,
      permissionsInfos,
      apiKey,
      cartaroUrl,
      appBaseUrl,
      vectorTilesKey,
      vectorTilesUrl,
      permissionUrl,
      dispatchFetchPermissionsInfos,
    } = this.props;

    if (permissionUrl !== prevProps.permissionUrl && permissionUrl) {
      dispatchFetchPermissionsInfos(permissionUrl);
    }

    if (activeTopic !== prevProps.activeTopic) {
      this.updateServices(activeTopic);
    }

    if (permissionsInfos !== prevProps.permissionsInfos) {
      console.log('loadTopics permission changed');
    }

    if (topics !== prevProps.topics) {
      console.log('loadTopics withtopcis changed');
    }

    if (
      permissionsInfos !== prevProps.permissionsInfos ||
      topics !== prevProps.topics
    ) {
      this.loadTopics();
    }

    if (
      vectorTilesUrl !== prevProps.vectorTilesUrl ||
      apiKey !== prevProps.apiKey ||
      vectorTilesKey !== prevProps.vectorTilesKey ||
      vectorTilesUrl !== prevProps.vectorTilesUrl ||
      cartaroUrl !== prevProps.cartaroUrl ||
      appBaseUrl !== prevProps.appBaseUrl
    ) {
      this.updateServices(activeTopic);
    }
  }

  loadTopics() {
    console.log('loadTopics');
    const matomo = this.context;
    const {
      topics,
      appBaseUrl,
      permissionsInfos,
      dispatchSetTopics,
      dispatchSetActiveTopic,
    } = this.props;

    // Load onl ytopics when permissions are loaded, to avoid double loading.
    if (!topics.length) {
      return;
    }
    const activeTopic = topics.find(t => t.active);
    const visibleTopics = topics.filter(
      t =>
        !t.permission ||
        (permissionsInfos &&
          permissionsInfos.permissions.includes(t.permission)),
    );
    let visibleActiveTopic = visibleTopics.find(t => t.active);

    // If the user has receive permissions info, he's not logged in and the topic is hidden, we redirect to the login page.
    if (
      permissionsInfos &&
      !permissionsInfos.user &&
      activeTopic &&
      !visibleActiveTopic
    ) {
      console.log(
        'redirect',
        activeTopic,
        !visibleActiveTopic,
        appBaseUrl,
        permissionsInfos,
      );
      alert();
      debugger;
      redirectToLogin(appBaseUrl);
      return;
    }

    visibleActiveTopic = visibleActiveTopic || topics[0];
    visibleActiveTopic.active = true; // in case we fall back to the first topic.
    dispatchSetTopics(visibleTopics);
    dispatchSetActiveTopic(visibleActiveTopic);
    this.updateServices(visibleActiveTopic);

    if (matomo) {
      matomo.trackEvent({ category: visibleActiveTopic.name, action: 'load' });
    }
  }

  updateServices(activeTopic) {
    const {
      t,
      apiKey,
      appBaseUrl,
      layerService,
      dispatchSetFeatureInfo,
      dispatchSetSearchService,
    } = this.props;

    if (!activeTopic) {
      this.updateLayers([]);
      dispatchSetSearchService();
      return;
    }

    if (activeTopic.redirect) {
      // Redirection to the old wkp
      redirect(appBaseUrl, activeTopic.key, {
        baselayers: '',
        layers: '',
      });
      return;
    }

    this.updateLayers(activeTopic.layers);

    const newSearchService = new SearchService();
    newSearchService.setSearches(activeTopic.searches || []);
    newSearchService.setApiKey(apiKey);
    newSearchService.setSearchesProps({
      t,
      activeTopic,
      layerService,
      dispatchSetFeatureInfo,
    });
    dispatchSetSearchService(newSearchService);
  }

  updateLayers(topicLayers) {
    const {
      layerService,
      dispatchSetLayers,
      cartaroUrl,
      appBaseUrl,
      vectorTilesKey,
      vectorTilesUrl,
    } = this.props;

    const [currentBaseLayer] = layerService
      .getLayersAsFlatArray()
      .filter(l => l.getIsBaseLayer() && l.getVisible());

    const visibleBaseLayers = topicLayers.filter(
      l => l.getIsBaseLayer() && l.getVisible(),
    );

    // Set the visible baselayer if need to be changed on topic change.
    if (visibleBaseLayers.indexOf(currentBaseLayer) === -1) {
      topicLayers
        .filter(l => l.getIsBaseLayer())
        .forEach((lay, idx) => {
          lay.setVisible(idx === 0);
        });
    }

    layerService.setLayers(topicLayers);
    const flatLayers = layerService.getLayersAsFlatArray();
    dispatchSetLayers(topicLayers);

    for (let i = 0; i < flatLayers.length; i += 1) {
      if (flatLayers[i].setGeoServerUrl) {
        flatLayers[i].setGeoServerUrl(`${appBaseUrl}/geoserver/trafimage/ows`);
      } else if (flatLayers[i].setGeoServerWMSUrl) {
        flatLayers[i].setGeoServerWMSUrl(
          `${appBaseUrl}/geoserver/trafimage/ows/service/wms`,
        );
      } else if (flatLayers[i].setGeoJsonUrl) {
        flatLayers[i].setGeoJsonUrl(`${appBaseUrl}/service/gjc/ows`);
      } else if (flatLayers[i].setStyleConfig) {
        flatLayers[i].setStyleConfig(vectorTilesUrl, vectorTilesKey);
      } else if (flatLayers[i].setCartaroUrl) {
        flatLayers[i].setCartaroUrl(cartaroUrl);
      }
    }
  }

  render() {
    const { history, appBaseUrl } = this.props;
    return <TopicElements history={history} appBaseUrl={appBaseUrl} />;
  }
}

const mapStateToProps = state => ({
  activeTopic: state.app.activeTopic,
  layerService: state.app.layerService,
  permissionsInfos: state.app.permissionsInfos,
});

const mapDispatchToProps = {
  dispatchSetActiveTopic: setActiveTopic,
  dispatchSetLayers: setLayers,
  dispatchSetTopics: setTopics,
  dispatchSetFeatureInfo: setFeatureInfo,
  dispatchSetSearchService: setSearchService,
  dispatchFetchPermissionsInfos: fetchPermissionsInfos,
};

TopicLoader.propTypes = propTypes;
TopicLoader.defaultProps = defaultProps;
TopicLoader.contextType = MatomoContext;

export default compose(
  withTranslation(),
  connect(mapStateToProps, mapDispatchToProps),
)(TopicLoader);
