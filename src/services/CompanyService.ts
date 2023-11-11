import db from '@src/utils/db';

interface CompanyRequest {
  name: string;
  size: string;
}

const createCompanyByNameAndSize = (data: CompanyRequest, id: string) => {
  return db.company.create({
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
};

const updateCompany = (data: CompanyRequest, id: bigint) => {
  return db.company.update({
    data,
    where: {
      id,
    },
  });
};

const getCompanyEmployees = (companyID: bigint) => {
  return db.user.findMany({
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
