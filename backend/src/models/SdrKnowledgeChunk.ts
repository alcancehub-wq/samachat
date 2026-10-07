import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";

import SdrKnowledgeFile from "./SdrKnowledgeFile";

@Table
class SdrKnowledgeChunk extends Model<SdrKnowledgeChunk> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => SdrKnowledgeFile)
  @Column
  fileId: number;

  @BelongsTo(() => SdrKnowledgeFile)
  file: SdrKnowledgeFile;

  @AllowNull(false)
  @Column
  position: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  content: string;

  // JSON com o vetor de embedding (lista de numeros).
  @AllowNull(false)
  @Column(DataType.TEXT({ length: "medium" }))
  embedding: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SdrKnowledgeChunk;
