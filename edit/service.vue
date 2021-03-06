<script>
import { isEmpty, isNaN } from 'lodash';
import ArrayList from '@/components/form/ArrayList';
import CreateEditView from '@/mixins/create-edit-view';
import KeyValue from '@/components/form/KeyValue';
import LabeledInput from '@/components/form/LabeledInput';
import NameNsDescription from '@/components/form/NameNsDescription';
import RadioGroup from '@/components/form/RadioGroup';
import ServicePorts from '@/components/form/ServicePorts';
import Tab from '@/components/Tabbed/Tab';
import Tabbed from '@/components/Tabbed';
import UnitInput from '@/components/form/UnitInput';
import { DEFAULT_SERVICE_TYPES, HEADLESS, CLUSTERIP } from '@/models/service';
import { ucFirst } from '@/utils/string';
import CruResource from '@/components/CruResource';
import InfoBox from '@/components/InfoBox';
import Banner from '@/components/Banner';
import Labels from '@/components/form/Labels';

const SESSION_AFFINITY_ACTION_VALUES = {
  NONE:      'None',
  CLUSTERIP: 'ClientIP'
};

const SESSION_AFFINITY_ACTION_LABELS = {
  NONE:      'servicesPage.affinity.actionLabels.none',
  CLUSTERIP: 'servicesPage.affinity.actionLabels.clusterIp'
};

const SESSION_STICKY_TIME_DEFAULT = 10800;

export default {
  // Props are found in CreateEditView
  // props: {},

  components: {
    ArrayList,
    Banner,
    CruResource,
    InfoBox,
    KeyValue,
    Labels,
    LabeledInput,
    NameNsDescription,
    RadioGroup,
    ServicePorts,
    Tab,
    Tabbed,
    UnitInput
  },

  mixins: [CreateEditView],

  data() {
    if (!this?.value?.spec?.type) {
      if (!this.value?.spec) {
        this.$set(this.value, 'spec', {
          ports:           [],
          sessionAffinity: 'None'
        });
      }
    }

    return {
      defaultServiceTypes:         DEFAULT_SERVICE_TYPES,
      saving:                      false,
      sessionAffinityActionLabels: Object.values(SESSION_AFFINITY_ACTION_LABELS)
        .map(v => this.$store.getters['i18n/t'](v))
        .map(ucFirst),
      sessionAffinityActionOptions: Object.values(
        SESSION_AFFINITY_ACTION_VALUES
      )
    };
  },

  computed: {
    serviceType: {
      get() {
        const serviceType = this.value?.spec?.type;
        const clusterIp = this.value?.spec?.clusterIP;

        if (serviceType) {
          if (serviceType === CLUSTERIP && clusterIp === 'None') {
            return HEADLESS;
          } else {
            return serviceType;
          }
        }

        return serviceType;
      },

      set(serviceType) {
        if (serviceType === HEADLESS) {
          this.$set(this.value.spec, 'type', CLUSTERIP);
          this.$set(this.value.spec, 'clusterIP', 'None');
        } else {
          if (
            serviceType !== HEADLESS &&
            this.value?.spec?.clusterIP === 'None'
          ) {
            this.$set(this.value.spec, 'clusterIP', null);
          } else if (serviceType === 'ExternalName') {
            this.$set(this.value.spec, 'ports', null);
          }

          this.$set(this.value.spec, 'type', serviceType);
        }
      }
    }
  },

  watch: {
    'value.spec.sessionAffinity'(val) {
      if (val === CLUSTERIP) {
        this.value.spec.sessionAffinityConfig = { clientIP: { timeoutSeconds: null } };

        // set it null and then set it with vue to make reactive.
        this.$set(
          this.value.spec.sessionAffinityConfig.clientIP,
          'timeoutSeconds',
          SESSION_STICKY_TIME_DEFAULT
        );
      } else if (
        this.value?.spec?.sessionAffinityConfig?.clientIP?.timeoutSeconds
      ) {
        delete this.value.spec.sessionAffinityConfig.clientIP.timeoutSeconds;
      }
    }
  },

  methods: {
    checkTypeIs(typeIn) {
      const { serviceType } = this;

      if (serviceType === typeIn) {
        return true;
      }

      return false;
    },

    updateServicePorts(servicePorts) {
      servicePorts.forEach((sp) => {
        if (!isEmpty(sp?.targetPort)) {
          const tpCoerced = parseInt(sp.targetPort, 10);

          if (!isNaN(tpCoerced)) {
            sp.targetPort = tpCoerced;
          }
        }
      });

      this.$set(this.value.spec, 'ports', servicePorts);
    }
  }
};
</script>

<template>
  <CruResource
    :done-route="doneRoute"
    :mode="mode"
    :resource="value"
    :selected-subtype="serviceType"
    :subtypes="defaultServiceTypes"
    :validation-passed="true"
    :errors="errors"
    @error="e=>errors = e"
    @finish="save"
    @cancel="done"
    @select-type="(st) => serviceType = st"
    @apply-hooks="() => applyHooks('_beforeSaveHooks')"
  >
    <NameNsDescription v-if="!isView" :value="value" :mode="mode" />

    <div class="spacer"></div>

    <Tabbed :side-tabs="true">
      <Tab
        v-if="checkTypeIs('ExternalName')"
        name="define-external-name"
        :label="t('servicesPage.externalName.define')"
      >
        <div class="clearfix">
          <h4>
            <t k="servicesPage.externalName.label" />
          </h4>
          <InfoBox>
            <div>{{ t('servicesPage.externalName.helpText') }}</div>
          </InfoBox>
        </div>
        <div class="row mt-10">
          <div class="col span-6">
            <span v-if="isView">{{ value.spec.externalName }}</span>
            <input
              v-else
              ref="external-name"
              v-model.number="value.spec.externalName"
              type="text"
              :placeholder="t('servicesPage.externalName.placeholder')"
            />
          </div>
        </div>
      </Tab>
      <Tab v-else name="define-service-ports" :label="t('servicesPage.ips.define')">
        <ServicePorts
          v-model="value.spec.ports"
          class="col span-12"
          :mode="mode"
          :spec-type="serviceType"
          @input="updateServicePorts"
        />
      </Tab>
      <Tab
        v-if="!checkTypeIs('ExternalName')"
        name="selectors"
        :label="t('servicesPage.selectors.label')"
      >
        <div class="row">
          <div class="col span-12">
            <InfoBox>
              <div>{{ t('servicesPage.selectors.helpText') }}</div>
            </InfoBox>
          </div>
        </div>
        <div class="row">
          <div class="col span-12">
            <KeyValue
              key="selectors"
              v-model="value.spec.selector"
              :mode="mode"
              :initial-empty-row="true"
              :pad-left="false"
              :protip="false"
              @input="e=>$set(value.spec, 'selector', e)"
            />
          </div>
        </div>
      </Tab>
      <Tab name="ips" :label="t('servicesPage.ips.label')">
        <div class="row">
          <div class="col span-12">
            <Banner color="warning" :label="t('servicesPage.ips.helpText')" />
          </div>
        </div>
        <div
          v-if="checkTypeIs('ClusterIP') || checkTypeIs('LoadBalancer') || checkTypeIs('NodePort')"
          class="row mb-20"
        >
          <div class="col span-6">
            <LabeledInput
              v-model="value.spec.clusterIP"
              :mode="mode"
              :label="t('servicesPage.ips.input.label')"
              :placeholder="t('servicesPage.ips.input.placeholder')"
              @input="e=>$set(value.spec, 'clusterIP', e)"
            >
              <template #corner>
                <i
                  v-if="checkTypeIs('ClusterIP') || checkTypeIs('LoadBalancer') || checkTypeIs('NodePort')"
                  v-tooltip="t('servicesPage.ips.clusterIpHelpText')"
                  class="icon icon-info"
                  style="font-size: 12px"
                />
              </template>
            </LabeledInput>
          </div>
        </div>
        <div class="row">
          <div class="col span-7">
            <ArrayList
              key="clusterExternalIpAddresses"
              v-model="value.spec.externalIPs"
              :title="t('servicesPage.ips.external.label')"
              :value-placeholder="t('servicesPage.ips.external.placeholder')"
              :value-multiline="false"
              :mode="mode"
              :pad-left="false"
              :protip="t('servicesPage.ips.external.protip')"
              @input="e=>$set(value.spec, 'externalIPs', e)"
            />
          </div>
        </div>
      </Tab>
      <Tab
        v-if="!checkTypeIs('ExternalName') && !checkTypeIs('Headless')"
        name="session-affinity"
        :label="t('servicesPage.affinity.label')"
      >
        <div class="col span-12">
          <InfoBox>
            <div>{{ t('servicesPage.affinity.helpText') }}</div>
          </InfoBox>
        </div>
        <div class="row session-affinity">
          <div class="col span-6">
            <RadioGroup
              v-model="value.spec.sessionAffinity"
              name="sessionAffinity"
              class="enforcement-action"
              :options="sessionAffinityActionOptions"
              :labels="sessionAffinityActionLabels"
              :mode="mode"
            />
          </div>
          <div v-if="value.spec.sessionAffinity === 'ClientIP'" class="col span-6">
            <UnitInput
              v-model="value.spec.sessionAffinityConfig.clientIP.timeoutSeconds"
              :suffix="t('suffix.seconds')"
              :label="t('servicesPage.affinity.timeout.label')"
              :placeholder="t('servicesPage.affinity.timeout.placeholder')"
              @input="e=>$set(value.spec.sessionAffinityConfig.clientIP, 'timeoutSeconds', e)"
            />
          </div>
        </div>
      </Tab>
      <Tab
        v-if="!isView"
        name="labels-and-annotations"
        :label="t('servicesPage.labelsAnnotations.label', {}, true)"
        :weight="1000"
      >
        <Labels
          :default-container-class="'labels-and-annotations-container'"
          :value="value"
          :mode="mode"
          :display-side-by-side="false"
        />
      </Tab>
    </Tabbed>
  </CruResource>
</template>

<style lang="scss">
.labels-and-annotations-container {
  > div:last-child {
    border-top: 1px solid var(--border);
    margin-top: 20px;
    padding-top: 20px;
  }
}
</style>
