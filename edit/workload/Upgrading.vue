<script>
import { get } from '@/utils/object';
import RadioGroup from '@/components/form/RadioGroup';
import UnitInput from '@/components/form/UnitInput';
import { WORKLOAD_TYPES } from '@/config/types';
import { _CREATE } from '@/config/query-params';
import { mapGetters } from 'vuex';
import InputWithSelect from '@/components/form/InputWithSelect';

export default {
  components: {
    RadioGroup, UnitInput, InputWithSelect
  },
  props:      {
    // spec
    value: {
      type:    Object,
      default: () => {
        return {};
      }
    },

    type: {
      type:    String,
      default: WORKLOAD_TYPES.DEPLOYMENT
    },

    mode: { type: String, default: _CREATE },
  },
  data() {
    const {
      strategy:strategyObj = {}, minReadySeconds = 0, progressDeadlineSeconds = 600, revisionHistoryLimit = 10
    } = this.value;
    const strategy = strategyObj.type || 'RollingUpdate';
    let maxSurge = '25';
    let maxUnavailable = '25';
    let surgeUnits = '%';
    let unavaiableUnits = '%';

    if (strategyObj.rollingUpdate) {
      maxSurge = strategyObj.rollingUpdate.maxSurge;
      maxUnavailable = strategyObj.rollingUpdate.maxUnavailable;

      if ( typeof maxSurge === 'string' && maxSurge.includes('%')) {
        maxSurge = maxSurge.slice(0, maxSurge.indexOf('%'));
      } else {
        surgeUnits = 'Pods';
      }

      if ( typeof maxUnavailable === 'string' && maxUnavailable.includes('%')) {
        unavaiableUnits = '%';
        maxUnavailable = maxUnavailable.slice(0, maxUnavailable.indexOf('%'));
      } else {
        unavaiableUnits = 'Pods';
      }
    }
    const partition = get(strategyObj, `${ strategy }.partition`) || 0;

    const podSpec = get(this.value, 'template.spec');

    const { terminationGracePeriodSeconds = 30 } = podSpec;

    return {
      surgeUnits,
      unavaiableUnits,
      strategy,
      minReadySeconds,
      progressDeadlineSeconds,
      maxSurge,
      maxUnavailable,
      revisionHistoryLimit,
      partition,
      terminationGracePeriodSeconds,
    };
  },
  computed: {
    strategyOptions() {
      switch (this.type) {
      case WORKLOAD_TYPES.DEPLOYMENT:
        return {
          options: ['RollingUpdate', 'Recreate'],
          labels:  [this.t('workload.upgrading.strategies.labels.rollingUpdate'), this.t('workload.upgrading.strategies.labels.recreate')]
        };
      case WORKLOAD_TYPES.DAEMON_SET:
      case WORKLOAD_TYPES.STATEFUL_SET:
        return {
          options: ['RollingUpdate', 'Delete'],
          labels:  [this.t('workload.upgrading.strategies.labels.rollingUpdate'), this.t('workload.upgrading.strategies.labels.delete')]
        };
      default:
        return null;
      }
    },

    isDeployment() {
      return this.type === WORKLOAD_TYPES.DEPLOYMENT;
    },

    isStatefulSet() {
      return this.type === WORKLOAD_TYPES.STATEFUL_SET;
    },

    isDaemonSet() {
      return this.type === WORKLOAD_TYPES.DAEMON_SET;
    },

    ...mapGetters({ t: 'i18n/t' })
  },

  methods: {
    update() {
      const podSpec = this.value?.template?.spec;
      const {
        minReadySeconds, revisionHistoryLimit, progressDeadlineSeconds, terminationGracePeriodSeconds, partition
      } = this;
      let { maxSurge, maxUnavailable } = this;

      if (this.surgeUnits === '%' && !maxSurge.includes('%')) {
        maxSurge = `${ maxSurge }%`;
      }
      if (this.unavaiableUnits === '%' && !maxUnavailable.includes('%')) {
        maxUnavailable = `${ maxUnavailable }%`;
      }

      this.$set(podSpec, 'terminationGracePeriodSeconds', terminationGracePeriodSeconds);

      switch (this.type) {
      case WORKLOAD_TYPES.DEPLOYMENT: {
        let strategy;

        if (this.strategy === 'RollingUpdate') {
          strategy = {
            rollingUpdate: {
              maxSurge,
              maxUnavailable,
            },
            type: this.strategy
          };
        } else {
          strategy = { type: this.strategy };
        }

        Object.assign(this.value, {
          strategy, minReadySeconds, revisionHistoryLimit, progressDeadlineSeconds
        });
        break;
      }
      case WORKLOAD_TYPES.DAEMON_SET: {
        let updateStrategy;

        if (this.strategy === 'RollingUpdate') {
          updateStrategy = { rollingUpdate: { maxUnavailable }, type: this.strategy };
        } else {
          updateStrategy = { type: this.strategy };
        }

        Object.assign(this.value, {
          updateStrategy, minReadySeconds, revisionHistoryLimit
        });
        break;
      }
      case WORKLOAD_TYPES.STATEFUL_SET: {
        let updateStrategy;

        if (this.strategy === 'RollingUpdate') {
          updateStrategy = { rollingUpdate: { partition }, type: this.strategy };
        } else {
          updateStrategy = { type: this.strategy };
        }

        Object.assign(this.value, { updateStrategy, revisionHistoryLimit });
        break;
      }
      default:
        break;
      }
    },

    updateWithUnits({ selected:units, text:value }, target) {
      if (units === 'Pods') {
        this[target] = parseInt(value);
      } else {
        this[target] = `${ value }%`;
      }
      if (target === 'maxSurge') {
        this.surgeUnits = units;
      } else {
        this.unavaiableUnits = units;
      }

      this.update();
    }
  },
};
</script>

<template>
  <div @input="update">
    <!--workload  spec.upgradeStrategy -->
    <div v-if="strategyOptions" class="row mb-20">
      <div class="col">
        <RadioGroup
          v-model="strategy"
          name="strategy"
          :options="strategyOptions.options"
          :labels="strategyOptions.labels"
          :mode="mode"
        />
      </div>
    </div>
    <template v-if="strategy === 'RollingUpdate'">
      <div v-if="isStatefulSet" class="row mb-20">
        <div class="col span-6">
          <UnitInput v-model="partition" :suffix="partition == 1 ? 'Pod' : 'Pods'" :label="t('workload.upgrading.partition.label')" :mode="mode">
            <template #label>
              <label :style="{'color':'var(--input-label)'}">
                {{ t('workload.upgrading.partition.label') }}
                <i v-tooltip="t('workload.upgrading.partition.tip')" class="icon icon-info" style="font-size: 14px" />
              </label>
            </template>
          </UnitInput>
        </div>
      </div>
      <div v-else-if="isDeployment || isDaemonSet" class="row mb-20">
        <div v-if="isDeployment" class="col span-6">
          <InputWithSelect
            :text-value="maxSurge"
            :select-before-text="false"
            :select-value="surgeUnits"
            :text-label="t('workload.upgrading.maxSurge.label')"
            :mode="mode"
            type="number"
            :options="['Pods', '%']"
            @input="e=>updateWithUnits(e, 'maxSurge')"
          >
            <template #label>
              <label :style="{'color':'var(--input-label)'}">
                {{ t('workload.upgrading.maxSurge.label') }}
                <i v-tooltip="t('workload.upgrading.maxSurge.label')" class="icon icon-info" style="font-size: 14px" />
              </label>
            </template>
          </InputWithSelect>
        </div>
        <div class="col span-6">
          <InputWithSelect
            :text-value="maxUnavailable"
            :select-before-text="false"
            :select-value="unavaiableUnits"
            :text-label="t('workload.upgrading.maxUnavailable.label')"
            :mode="mode"
            type="number"
            :options="['Pods', '%']"
            @input="e=>updateWithUnits(e, 'maxUnavailable')"
          >
            <template #label>
              <label :style="{'color':'var(--input-label)'}">
                {{ t('workload.upgrading.maxUnavailable.label') }}
                <i v-tooltip="t('workload.upgrading.maxUnavailable.label')" class="icon icon-info" style="font-size: 14px" />
              </label>
            </template>
          </InputWithSelect>
        </div>
      </div>
    </template>

    <!-- workload spec -->
    <div class="row mb-20">
      <div v-if="!isStatefulSet" class="col span-6">
        <UnitInput v-model="minReadySeconds" :suffix="minReadySeconds == 1 ? 'Second' : 'Seconds'" :label="t('workload.upgrading.minReadySeconds.label')" :mode="mode">
          <template #label>
            <label :style="{'color':'var(--input-label)'}">
              {{ t('workload.upgrading.minReadySeconds.label') }}
              <i v-tooltip="t('workload.upgrading.minReadySeconds.tip')" class="icon icon-info" style="font-size: 14px" />
            </label>
          </template>
        </UnitInput>
      </div>
      <div v-if="isDeployment || isStatefulSet || isDaemonSet" class="col span-6">
        <UnitInput v-model="revisionHistoryLimit" :suffix="revisionHistoryLimit == 1 ? 'Set' : 'Sets'" :label="t('workload.upgrading.revisionHistoryLimit.label')" :mode="mode">
          <template #label>
            <label :style="{'color':'var(--input-label)'}">
              {{ t('workload.upgrading.revisionHistoryLimit.label') }}
              <i v-tooltip="t('workload.upgrading.revisionHistoryLimit.tip')" class="icon icon-info" style="font-size: 14px" />
            </label>
          </template>
        </UnitInput>
      </div>
    </div>
    <div v-if="isDeployment" class="row mb-20">
      <div class="col span-6">
        <UnitInput v-model="progressDeadlineSeconds" :suffix="progressDeadlineSeconds == 1 ? 'Second' : 'Seconds'" label="Progress Deadline" :mode="mode">
          <template #label>
            <label :style="{'color':'var(--input-label)'}">
              Progress Deadline
              <i v-tooltip="'How long to wait without seeing progress before marking the deployment as stalled.'" class="icon icon-info" style="font-size: 14px" />
            </label>
          </template>
        </UnitInput>
      </div>
    </div>

    <!-- pod spec -->
    <div class="row">
      <div class="col span-6">
        <UnitInput v-model="terminationGracePeriodSeconds" :suffix="terminationGracePeriodSeconds == 1 ? 'Second' : 'Seconds'" :label="t('workload.upgrading.activeDeadlineSeconds.label')" :mode="mode">
          <template #label>
            <label class="has-tooltip" :style="{'color':'var(--input-label)'}">
              {{ t('workload.upgrading.terminationGracePeriodSeconds.label') }}
              <i v-tooltip="t('workload.upgrading.terminationGracePeriodSeconds.tip')" class="icon icon-info" style="font-size: 14px" />
            </label>
          </template>
        </UnitInput>
      </div>
    </div>
  </div>
</template>
