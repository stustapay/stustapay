import { Resource, SimpleShowLayout, TextInput, required, NumberInput, AutocompleteInput } from "react-admin";
import { useParams } from "react-router-dom";
import {
  NodeReferenceField,
  NodeResourceCreate,
  NodeResourceDatagrid,
  NodeResourceEdit,
  NodeResourceList,
  NodeResourceShow,
} from "./components";

export const UserToRoleCreate = () => {
  return <NodeResourceCreate resource="user_to_roles"></NodeResourceCreate>;
};

export const UserToRoleEdit = () => {
  const { id } = useParams();
  return <NodeResourceEdit resource="user_to_roles" id={id}></NodeResourceEdit>;
};

export const UserToRoleShow = () => {
  const { id } = useParams();
  return (
    <NodeResourceShow resource="user_to_roles" id={id}>
      <SimpleShowLayout>
        <NodeReferenceField source="user_id" reference="users" />
      </SimpleShowLayout>
    </NodeResourceShow>
  );
};

export const UserToRoleList = () => {
  const { nodeId } = useParams();
  console.log("user to roles list");
  return (
    <NodeResourceList resource="user_to_roles" filter={{ nodeId }}>
      <NodeResourceDatagrid>
        <NodeReferenceField source="user_id" reference="users" />
      </NodeResourceDatagrid>
    </NodeResourceList>
  );
};

export const userToRoleResource = <Resource name="user_to_roles" />;
