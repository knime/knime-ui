type Payload = {
  repoType: "node" | "component";
  keyword: string;
};

export type SearchEvents = {
  "node_searched::noderepo_type_": Payload;
  "node_searched::qam_type_": Payload;
};
