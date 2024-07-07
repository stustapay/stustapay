import {
  Resource,
  TextField,
  NumberField,
  SimpleShowLayout,
  TextInput,
  required,
  NumberInput,
  AutocompleteInput,
  SimpleForm,
} from "react-admin";
import { useParams } from "react-router-dom";
import {
  NodeResourceCreate,
  NodeResourceDatagrid,
  NodeResourceEdit,
  NodeResourceList,
  NodeResourceShow,
} from "./components";

export const TseCreate = () => {
  return (
    <NodeResourceCreate resource="tses">
      <SimpleForm>
        <TextInput source="name" validate={[required()]} />
        <AutocompleteInput
          source="type"
          choices={[
            {
              id: "diebold_nixdorf",
              name: "Diebold Nixdorf TSE",
            },
          ]}
        />
        <TextInput source="ws_url" />
        <NumberInput source="ws_timeout" />
        <TextInput source="password" />
        <TextInput source="serial" />
      </SimpleForm>
    </NodeResourceCreate>
  );
};

export const TseEdit = () => {
  const { id } = useParams();
  return (
    <NodeResourceEdit resource="tses" id={id}>
      <SimpleForm>
        <TextInput source="name" validate={[required()]} />
        <TextInput source="ws_url" />
        <NumberInput source="ws_timeout" />
        <TextInput source="password" />
        <TextInput source="serial" />
      </SimpleForm>
    </NodeResourceEdit>
  );
};

export const TseShow = () => {
  const { id } = useParams();
  return (
    <NodeResourceShow resource="tses" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="type" />
        <TextField source="status" />
        <TextField source="ws_url" />
        <NumberField source="ws_timeout" />
        <TextField source="password" />
        <TextField source="serial" />
        <TextField source="hashalgo" />
        <TextField source="time_format" />
        <TextField source="public_key" />
        <TextField source="certificate" />
        <TextField source="process_data_encoding" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const TseList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="tses" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="name" />
        <TextField source="type" />
        <TextField source="serial" />
        <TextField source="status" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const tseResource = <Resource name="tses" />;
