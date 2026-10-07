import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  HasMany
} from "sequelize-typescript";

import SdrKnowledgeChunk from "./SdrKnowledgeChunk";

@Table
class SdrKnowledgeFile extends Model<SdrKnowledgeFile> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column
  category: string;

  @Column
  charCount: number;

  @Column
  chunkCount: number;

  @HasMany(() => SdrKnowledgeChunk)
  chunks: SdrKnowledgeChunk[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SdrKnowledgeFile;
