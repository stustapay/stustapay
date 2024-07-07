import { Resource, TextField, SimpleShowLayout, TextInput, required, SimpleForm } from "react-admin";
import { useParams } from "react-router-dom";
import {
  NodeReferenceField,
  NodeResourceCreate,
  NodeResourceDatagrid,
  NodeResourceEdit,
  NodeResourceList,
  NodeResourceShow,
} from "./components";

export const UserCreate = () => {
  return (
    <NodeResourceCreate resource="users">
      <SimpleForm>
        <TextInput source="login" validate={[required()]} />
        <TextInput source="display_name" validate={[required()]} />
        <TextInput source="description" />
        <TextInput source="password" />
        <TextInput source="confirm_password" />
      </SimpleForm>
    </NodeResourceCreate>
  );
};

export const UserEdit = () => {
  const { id } = useParams();
  return (
    <NodeResourceEdit resource="users" id={id}>
      <SimpleForm>
        <TextInput source="login" validate={[required()]} />
        <TextInput source="display_name" validate={[required()]} />
        <TextInput source="description" />
      </SimpleForm>
    </NodeResourceEdit>
  );
};

export const UserShow = () => {
  const { id } = useParams();
  return (
    <NodeResourceShow resource="users" id={id}>
      <SimpleShowLayout>
        <TextField source="id" />
        <TextField source="login" />
        <TextField source="display_name" />
        <TextField source="description" />
        <NodeReferenceField source="user_tag_id" reference="user_tags" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const UserList = () => {
  const { nodeId } = useParams();
  return (
    <NodeResourceList resource="users" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <TextField source="id" />
        <TextField source="login" />
        <TextField source="display_name" />
        <NodeReferenceField source="user_tag_id" reference="user_tags" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const userResource = <Resource name="users" />;
