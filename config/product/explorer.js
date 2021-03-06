import {
  CONFIG_MAP, HELM_RELEASE,
  NAMESPACE, NODE, SECRET, INGRESS,
  WORKLOAD, WORKLOAD_TYPES, SERVICE, HPA, NETWORK_POLICY, PV, PVC, STORAGE_CLASS, POD,
  RBAC,
} from '@/config/types';

import {
  STATE, NAME as NAME_COL, NAMESPACE_NAME, AGE, KEYS,
  INGRESS_TARGET, ROLES, VERSION, INTERNAL_EXTERNAL_IP, CPU, RAM,
  SPEC_TYPE, TARGET_PORT, SELECTOR, NODE as NODE_COL, TYPE
} from '@/config/table-headers';

import { DSL } from '@/store/type-map';

export const NAME = 'explorer';

export function init(store) {
  const {
    product,
    basicType,
    ignoreType,
    mapGroup,
    weightGroup,
    headers,
    virtualType,
    componentForType,
    uncreatableType,
    immutableType
  } = DSL(store, NAME);

  product({
    removable:           false,
    weight:              2,
    showNamespaceFilter: true,
    icon:                'compass'
  });

  basicType(['cluster-overview', HELM_RELEASE]);
  basicType([
    NAMESPACE,
    NODE,
  ], 'cluster');
  basicType([
    SERVICE,
    INGRESS,
    HPA,
    NETWORK_POLICY,
  ], 'serviceDiscovery');
  basicType([
    PV,
    PVC,
    STORAGE_CLASS,
    SECRET,
    CONFIG_MAP
  ], 'storage');
  basicType([
    WORKLOAD,
    WORKLOAD_TYPES.DEPLOYMENT,
    WORKLOAD_TYPES.STATEFUL_SET,
    WORKLOAD_TYPES.JOB,
    POD,
  ], 'workload');
  basicType([
    RBAC.ROLE,
    RBAC.CLUSTER_ROLE,
    RBAC.ROLE_BINDING,
    RBAC.CLUSTER_ROLE_BINDING,
  ], 'rbac');

  weightGroup('cluster', 99, true);
  weightGroup('workload', 98, true);
  weightGroup('serviceDiscovery', 97, true);
  weightGroup('storage', 96, true);
  weightGroup('rbac', 95, true);

  for (const key in WORKLOAD_TYPES) {
    componentForType(WORKLOAD_TYPES[key], WORKLOAD);
  }

  ignoreType('events.k8s.io.event'); // Old, moved into core
  ignoreType('extensions.ingress'); // Old, moved into networking

  mapGroup(/^(core)?$/, 'Core');
  mapGroup('apps', 'Apps');
  mapGroup('batch', 'Batch');
  mapGroup('autoscaling', 'Autoscaling');
  mapGroup('policy', 'Policy');
  mapGroup('networking.k8s.io', 'Networking');
  mapGroup(/^api.*\.k8s\.io$/, 'API');
  mapGroup('rbac.authorization.k8s.io', 'RBAC');
  mapGroup('admissionregistration.k8s.io', 'Admission');
  mapGroup('crd.projectcalico.org', 'Calico');
  mapGroup(/^(.+\.)?cert-manager\.(k8s\.)?io$/, 'Cert Manager');
  mapGroup(/^(.+\.)?(gateway|gloo)\.solo\.io$/, 'Gloo');
  mapGroup(/^(.*\.)?monitoring\.coreos\.com$/, 'Monitoring');
  mapGroup(/^(.*\.)?tekton\.dev$/, 'Tekton');
  mapGroup(/^(.*\.)?longhorn(\.rancher)?\.io$/, 'Longhorn');
  mapGroup(/^(.*\.)?fleet\.cattle\.io$/, 'Fleet');
  mapGroup(/^(.*\.)?(helm|upgrade|k3s)\.cattle\.io$/, 'k3s');
  mapGroup(/^(.*\.)?cis\.cattle\.io$/, 'CIS');
  mapGroup(/^(catalog|project|management)\.cattle\.io$/, 'Rancher');
  mapGroup(/^(.*\.)?istio\.io$/, 'Istio');
  mapGroup('split.smi-spec.io', 'SMI');
  mapGroup(/^(.*\.)*knative\.(io|dev)$/, 'Knative');
  mapGroup('argoproj.io', 'Argo');
  mapGroup('logging.banzaicloud.io', 'Logging');
  mapGroup(/.*resources\.cattle\.io.*/, 'Backup-Restore');

  uncreatableType(NODE);
  immutableType(NODE);

  headers(CONFIG_MAP, [NAMESPACE_NAME, KEYS, AGE]);
  headers(SECRET, [
    STATE,
    NAMESPACE_NAME,
    {
      name:      'type',
      label:     'Type',
      value:     'tableTypeDisplay',
      sort:      ['typeDisplay', 'nameSort'],
      width:     100,
      formatter: 'SecretType'
    },
    {
      name:      'data',
      label:     'Data',
      value:     'dataPreview',
      formatter: 'SecretData'
    },
    AGE
  ]);
  headers(INGRESS, [STATE, NAMESPACE_NAME, INGRESS_TARGET, AGE]);
  headers(NODE, [STATE, NAME_COL, ROLES, VERSION, INTERNAL_EXTERNAL_IP, CPU, RAM, AGE]);
  headers(SERVICE, [STATE, NAME_COL, SPEC_TYPE, TARGET_PORT, SELECTOR, AGE]);

  headers(WORKLOAD, [STATE, NAMESPACE_NAME, TYPE, 'Ready', AGE]);
  headers(WORKLOAD_TYPES.DEPLOYMENT, [STATE, NAMESPACE_NAME, 'Ready', 'Up-to-date', 'Available', AGE]);
  headers(WORKLOAD_TYPES.DAEMON_SET, [STATE, NAMESPACE_NAME, 'Ready', 'Current', 'Desired', AGE]);
  headers(WORKLOAD_TYPES.REPLICA_SET, [STATE, NAMESPACE_NAME, 'Ready', 'Current', 'Desired', AGE]);
  headers(WORKLOAD_TYPES.STATEFUL_SET, [STATE, NAMESPACE_NAME, 'Ready', AGE]);
  headers(WORKLOAD_TYPES.JOB, [STATE, NAMESPACE_NAME, 'Completions', 'Duration', AGE]);
  headers(WORKLOAD_TYPES.CRON_JOB, [STATE, NAMESPACE_NAME, 'Schedule', 'Last Schedule', AGE]);
  headers(WORKLOAD_TYPES.REPLICATION_CONTROLLER, [STATE, NAMESPACE_NAME, 'Ready', 'Current', 'Desired', AGE]);
  headers(POD, [STATE, NAMESPACE_NAME, 'Ready', 'Restarts', 'IP', NODE_COL, AGE]);

  // These look to be for [Cluster]RoleTemplate, not [Cluster]Role.
  // headers(RBAC.ROLE, [
  //   STATE,
  //   NAME_COL,
  //   BUILT_IN,
  //   AGE
  // ]);

  // headers(RBAC.CLUSTER_ROLE, [
  //   STATE,
  //   NAME_COL,
  //   BUILT_IN,
  //   CLUSTER_CREATOR_DEFAULT,
  //   AGE
  // ]);

  virtualType({
    label:       'Overview',
    group:      'Root',
    namespaced:  false,
    name:        'cluster-overview',
    weight:      100,
    route:       { name: 'c-cluster-explorer' },
    exact:       true,
  });

  virtualType({
    label:      'Overview',
    group:      'Workload',
    namespaced: true,
    name:       'workload',
    weight:     99,
    route:      {
      name:     'c-cluster-product-resource',
      params:   { resource: WORKLOAD }
    },
  });
}
