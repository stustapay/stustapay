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
  AutocompleteArrayInput,
  required,
  ArrayField,
  ChipField,
} from "react-admin";
import { useParams } from "react-router-dom";
import {
  CurrencyField,
  NodeReferenceField,
  NodeReferenceInput,
  NodeResourceCreate,
  NodeResourceDatagrid,
  NodeResourceEdit,
  NodeResourceList,
  NodeResourceShow,
} from "./components";

const ProductForm = () => {
  return (
    <SimpleForm>
      <TextInput source="name" validate={required()} />

      <BooleanInput source="is_locked" />
      <BooleanInput source="is_returnable" />
      <BooleanInput source="fixed_price" />
      <NumberInput source="price_in_vouchers" />
      <NumberInput source="price" />

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

export const ProductCreate = () => {
  return (
    <NodeResourceCreate resource="products">
      <ProductForm />
    </NodeResourceCreate>
  );
};

export const ProductEdit = () => {
  const { id } = useParams();
  return (
    <NodeResourceEdit resource="products" id={id}>
      <ProductForm />
    </NodeResourceEdit>
  );
};

export const ProductShow = () => {
  const { id } = useParams();
  return (
    <NodeResourceShow resource="products" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="type" />
        <TextField source="name" />

        <BooleanField source="is_locked" />
        <BooleanField source="is_returnable" />
        <BooleanField source="fixed_price" />
        <NumberField source="price_in_vouchers" />
        <CurrencyField source="price_per_voucher" />
        <CurrencyField source="price" />

        <ChipField source="restrictions" />

        <NodeReferenceField source="tax_rate_id" reference="tax_rates" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const ProductList = () => {
  const { nodeId } = useParams();

  return (
    <NodeResourceList resource="products" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <BooleanField source="is_locked" />
        <BooleanField source="fixed_price" />
        <NodeReferenceField source="tax_rate_id" reference="tax_rates" />
        <NumberField source="price_in_vouchers" />
        <CurrencyField source="price" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const productResource = <Resource name="products" />;
