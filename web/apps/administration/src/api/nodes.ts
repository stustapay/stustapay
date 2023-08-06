export type ObjectType =
  | "till"
  | "product"
  | "ticket"
  | "user"
  | "user_role"
  | "account"
  | "order"
  | "tax_rate"
  | "user-tags";

export interface TreeNode {
  id: string;
  name: string;
  type?: "event";
  allowedObjectTypes?: ObjectType[];
  children: readonly TreeNode[];
  parents: string[];
}

const tree: TreeNode = {
  id: "root",
  name: "root",
  parents: [],
  children: [
    {
      id: "vkl",
      name: "VKL",
      parents: [],
      children: [
        {
          id: "ssc",
          name: "SSC",
          parents: [],
          children: [
            {
              id: "ssc-2023",
              type: "event",
              name: "SSC 2023",
              allowedObjectTypes: ["user", "account", "product", "ticket", "user_role", "user-tags"],
              parents: [],
              children: [
                {
                  id: "intern",
                  name: "Intern",
                  allowedObjectTypes: ["user", "product", "user_role"],
                  parents: [],
                  children: [
                    {
                      id: "bierteam",
                      name: "Bierteam",
                      allowedObjectTypes: ["user", "user_role"],
                      parents: [],
                      children: [
                        {
                          id: "weissbierinsel",
                          name: "Weißbierinsel",
                          children: [],
                          parents: [],
                          allowedObjectTypes: ["user", "till", "user_role", "order"],
                        },
                        {
                          id: "weissbierkarussell",
                          name: "Weißbierkarussell",
                          children: [],
                          parents: [],
                          allowedObjectTypes: ["user", "till", "user_role", "order"],
                        },
                        {
                          id: "potzelt",
                          name: "Potzelt",
                          children: [],
                          parents: [],
                          allowedObjectTypes: ["user", "till", "user_role", "order"],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "extern",
                  name: "Extern",
                  parents: [],
                  children: [
                    {
                      id: "falafel",
                      name: "Falafel",
                      allowedObjectTypes: ["user", "till", "product", "account", "user_role", "order"],
                      parents: [],
                      children: [],
                    },
                    {
                      id: "tolle_knolle",
                      name: "Tolle Knolle",
                      allowedObjectTypes: ["user", "till", "product", "account", "user_role", "order"],
                      parents: [],
                      children: [],
                    },
                  ],
                },
              ],
            },
            { id: "ssc-2024", type: "event", name: "SSC 2024", parents: [], children: [] },
          ],
        },
        {
          id: "gluehfix",
          name: "Glühfix",
          parents: [],
          children: [
            { id: "gf-2023", type: "event", name: "Glühfix 2023", parents: [], children: [] },
            { id: "gf-2024", type: "event", name: "Glühfix 2024", parents: [], children: [] },
          ],
        },
      ],
    },
  ],
};

const updateTreeParents = (node: TreeNode, currentParents: string[] = []) => {
    node.parents = currentParents;
    const nextParents = [...currentParents, node.id];
    for (const child of node.children) {
        updateTreeParents(child, nextParents);
    }
}
updateTreeParents(tree);

export const findNode = (nodeId: string, startNode?: TreeNode): TreeNode | undefined => {
  const currNode = startNode ?? tree;
  if (currNode.id === nodeId) {
    return currNode;
  }
  for (const child of currNode.children) {
    const found = findNode(nodeId, child);
    if (found) {
      return found;
    }
  }
  return undefined;
};

export const useNode = ({ nodeId }: { nodeId: string }): { node: TreeNode | undefined } => {
  return { node: findNode(nodeId) };
};

export const useNodeTree = (): { root: TreeNode } => {
  return { root: tree };
};
