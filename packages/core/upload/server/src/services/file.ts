import { cloneDeep } from 'lodash/fp';
import { async } from '@strapi/utils';

import { FOLDER_MODEL_UID, FILE_MODEL_UID } from '../constants';
import { getService } from '../utils';

import { Config, type File } from '../types';

const getFolderPath = async (folderId?: number | null) => {
  if (!folderId) return '/';

  const parentFolder = await strapi.db.query(FOLDER_MODEL_UID).findOne({ where: { id: folderId } });

  return parentFolder.path;
};

const deleteByIds = async (ids: number[] = []) => {
  const filesToDelete = await strapi.db
    .query(FILE_MODEL_UID)
    .findMany({ where: { id: { $in: ids } } });

  await Promise.all(filesToDelete.map((file: File) => getService('upload').remove(file)));

  return filesToDelete;
};

const signFileUrls = async (file: File) => {
  const { provider } = strapi.plugins.upload;
  const { provider: providerConfig } = strapi.config.get<Config>('plugin::upload');
  const isPrivate = await provider.isPrivate();
  file.isUrlSigned = false;

  // Check file provider and if provider is private
  if (file.provider !== providerConfig || !isPrivate) {
    return file;
  }

  const signUrl = async (file: File) => {
    const signedUrl = await provider.getSignedUrl(file);
    file.url = signedUrl.url;
    file.isUrlSigned = true;
  };

  const signedFile = cloneDeep(file);

  // Sign each file format
  await signUrl(signedFile);
  if (file.formats) {
    await async.map(Object.values(signedFile.formats ?? {}), signUrl);
  }

  return signedFile;
};

type ParentLink = {
  [key: string]: number;
};
const getFolderNamePath = async (folderId?: number | null): Promise<string | null> => {
  if (!folderId) return null;

  const segments: string[] = [];

  // ✅ 复用 Strapi 官方 join table
  // @ts-expect-error internal metadata
  const { joinTable } = strapi.db.metadata
    .get(FOLDER_MODEL_UID)
    .attributes.parent;

  let currentId: number | null = folderId;

  while (currentId) {
    // 1️⃣ 查当前 folder
    const folder = await strapi.db
      .query(FOLDER_MODEL_UID)
      .findOne({
        where: { id: currentId },
        select: ['id', 'name'],
      });

    if (!folder) break;

    segments.unshift(folder.name);

    // 2️⃣ 查 parent（join table）
    const parentLink: ParentLink | undefined = await strapi.db
      .getConnection(joinTable.name)
      .where(joinTable.joinColumn.name, currentId)
      .first();

    currentId = parentLink
      ? parentLink[joinTable.inverseJoinColumn.name]
      : null;
  }

  return segments.join('/');
};

export default { getFolderPath, deleteByIds, signFileUrls, getFolderNamePath};
