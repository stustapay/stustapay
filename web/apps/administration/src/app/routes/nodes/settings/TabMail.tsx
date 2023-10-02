import { MarkdownEditor } from "@components";
import * as React from "react";

export const TabMail: React.FC = () => {
  const [mail, setMail] = React.useState("");

  return (
    <div>
      <h1>WIP WIP WIP WIP</h1>
      <MarkdownEditor label="Email Template" value={mail} onChange={setMail} showPreview={true} />
    </div>
  );
};
