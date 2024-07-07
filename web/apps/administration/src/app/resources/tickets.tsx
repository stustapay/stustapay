import {
  Resource,
  TextField,
  NumberField,
  BooleanField,
  SimpleShowLayout,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  required,
  AutocompleteArrayInput,
  ArrayField,
  SingleFieldList,
  ChipField,
} from "react-admin";
import { useParams } from "react-router-dom";
import {
  NodeReferenceField,
  NodeReferenceInput,
  NodeResourceCreate,
  NodeResourceDatagrid,
  NodeResourceList,
  NodeResourceShow,
} from "./components";
import { NodeResourceEdit } from "./components/NodeResourceEdit";

const TicketForm = () => {
  return (
    <SimpleForm>
      <TextInput source="name" validate={[required()]} />

      <BooleanInput source="is_locked" />
      <NumberInput source="initial_top_up_amount" validate={[required()]} />
      <NumberInput source="price" validate={[required()]} />

      <AutocompleteArrayInput
        source="restrictions"
        choices={[
          { id: "under_16", name: "Under 16" },
          { id: "under_18", name: "Under 18" },
        ]}
      />

      <NodeReferenceInput source="tax_rate_id" reference="tax_rates" />
    </SimpleForm>
  );
};

export const TicketCreate = () => {
  return (
    <NodeResourceCreate resource="tickets">
      <TicketForm />
    </NodeResourceCreate>
  );
};

export const TicketEdit = () => {
  const { id } = useParams();
  return (
    <NodeResourceEdit resource="tickets" id={id}>
      <TicketForm />
    </NodeResourceEdit>
  );
};

export const TicketShow = () => {
  const { id } = useParams();
  return (
    <NodeResourceShow resource="tickets" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="type" />
        <TextField source="name" />

        <BooleanField source="is_locked" />
        <NumberField source="initial_top_up_amount" options={{ style: "currency", currency: "EUR" }} />
        <NumberField source="price" options={{ style: "currency", currency: "EUR" }} />

        <ChipField source="restrictions" />
        <NodeReferenceField source="tax_rate_id" reference="tax_rates" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const TicketList = () => {
  const { nodeId } = useParams();

  return (
    <NodeResourceList resource="tickets" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <BooleanField source="is_locked" />
        <NodeReferenceField source="tax_rate_id" reference="tax_rates" />
        <NumberField source="initial_top_up_amount" options={{ style: "currency", currency: "EUR" }} />
        <NumberField source="price" options={{ style: "currency", currency: "EUR" }} />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const ticketResource = <Resource name="tickets" />;
