import db from '@src/utils/db';

interface CompanyRequest {
  name?: string;
  size?: string;
}

const createCompanyByNameAndSize = async (data: CompanyRequest, id: string) => {
  if (data.name && data.size) {
    return await db.company.create({
      data: {
        name: data.name,
        size: data.size,
        User: {
          connect: {
            id,
          },
        },
      },
    });
  }
};

const updateCompany = async (data: CompanyRequest, id: bigint) => {
  return await db.company.update({
    data,
    where: {
      id,
    },
  });
};

const getCompanyEmployees = async (companyID: bigint) => {
  return await db.user.findMany({
    where: {
      companyID,
    },
  });
};

export default {
  createCompanyByNameAndSize,
  updateCompany,
  getCompanyEmployees,
} as const;
