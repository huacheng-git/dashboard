<script>
import RbacPermissions from '@/components/RbacPermissions';
import CreateEditView from '@/mixins/create-edit-view';
import NameNsDescription from '@/components/form/NameNsDescription';
import Footer from '@/components/form/Footer';
import RadioGroup from '@/components/form/RadioGroup';
import ResourceTabs from '@/components/form/ResourceTabs';

/**
 * Edit view for RBAC Role
   @displayName Edit RBAC Role
 */
export default {
  name: 'CruRole',

  components: {
    Footer,
    NameNsDescription,
    RadioGroup,
    RbacPermissions,
    ResourceTabs
  },

  mixins: [CreateEditView],

  data() {
    const radioOptions = [true, false];
    const lockedLabels = ['Yes, New bindings are not allowed to use this role', 'No'];
    const newUserDefault = ['Yes, Default role for new user creation', 'No'];

    return {
      lockedLabels,
      newUserDefault,
      radioOptions,
    };
  },

  methods: {
    /**
     * Sends the user back to roles page after save is finished
     */
    done() {
      this.$router.replace({ name: 'rbac-roles' });
    }
  },
};
</script>

<template>
  <form>
    <NameNsDescription
      :value="value"
      :mode="mode"
      name-label="Name"
      :register-before-hook="registerBeforeHook"
    />

    <div class="spacer"></div>

    <section class="row">
      <div class="col span-6">
        <label for="rbac-create-type">
          Type
        </label>
        <div id="rbac-create-type">
          {{ value.type }}
        </div>
      </div>
    </section>

    <div class="spacer"></div>

    <section class="row">
      <div class="col span-6">
        <RadioGroup
          v-model="value.locked"
          name="locked"
          label="Locked"
          :options="radioOptions"
          :labels="lockedLabels"
        />
      </div>
      <div class="col span-6">
        <RadioGroup
          v-model="value.newUserDefault"
          name="newUserDefault"
          label="New User Default"
          :options="radioOptions"
          :labels="newUserDefault"
        />
      </div>
    </section>

    <div class="spacer"></div>

    <section>
      <div class="row">
        <RbacPermissions
          v-model="value.rules"
          :mode="mode"
          label="Grant Resources"
          btn-label="Grant Resource"
        />
      </div>
    </section>
    <ResourceTabs v-model="value" :mode="mode" />

    <Footer
      :mode="mode"
      :errors="errors"
      @save="save"
      @done="done"
    />
  </form>
</template>
