import { Check as CheckIcon, Close as CloseIcon, Edit as EditIcon } from "@mui/icons-material";
import { IconButton, InputAdornment, ListItem, ListItemSecondaryAction, ListItemText, TextField } from "@mui/material";
import * as React from "react";

export interface EditableListItemProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

export const EditableListItem: React.FC<EditableListItemProps> = ({ label, value, onChange }) => {
  const [internalValue, setInternalValue] = React.useState(value);
  const [editing, setEditing] = React.useState(false);

  const startEditing = () => {
    setEditing(true);
  };

  const cancelEdit = () => {
    setInternalValue(value);
    setEditing(false);
  };

  const saveEdit = () => {
    onChange(internalValue);
    setEditing(false);
  };

  const handleKeyUp: React.KeyboardEventHandler<HTMLDivElement> = ({ key }) => {
    if (key === "Enter") {
      saveEdit();
    }
  };

  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  if (!editing) {
    return (
      <ListItem>
        <ListItemText primary={label} secondary={value} />
        <ListItemSecondaryAction>
          <IconButton color="primary" onClick={startEditing}>
            <EditIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  }

  return (
    <ListItem>
      <TextField
        label={label}
        value={internalValue}
        variant="standard"
        onKeyUp={handleKeyUp}
        onChange={(evt) => setInternalValue(evt.target.value)}
        fullWidth
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton color="primary" onClick={saveEdit}>
                  <CheckIcon />
                </IconButton>
                <IconButton color="error" onClick={cancelEdit}>
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    </ListItem>
  );
};
