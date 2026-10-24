import type { Rule } from "@/index";
import { finding, isObject, nodesOf } from "@/rules/data";

/** Reports each repeated node identity after its first occurrence. */
export const uniqueNodeIds: Rule = (value) => {
  const nodes = nodesOf(value);
  return nodes.flatMap((node, index) => {
    if (!isObject(node) || typeof node["@id"] !== "string") return [];
    const first = nodes.findIndex(
      (other) => isObject(other) && other["@id"] === node["@id"],
    );
    return first === index
      ? []
      : [
          finding(
            "ujg/unique-node-ids",
            ["nodes", index, "@id"],
            `Duplicate node @id ${JSON.stringify(node["@id"])}; first declared at nodes[${first}].`,
          ),
        ];
  });
};
