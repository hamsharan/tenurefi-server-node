import db from '@src/utils/db';

export interface CreateSavingGoal {
  id?: bigint;
  title: string;
  goal: number;
  percentage: number;
  priority: number;
}

export interface UpdateSavingGoal {
  title?: string;
  goal?: number;
  progress?: number;
}

const getSavingGoal = async (id: bigint) => {
  return await db.savingGoal.findUnique({
    where: {
      id,
    },
  });
};

const getSavingGoals = async (userID: string) => {
  return await db.savingGoal.findMany({
    where: {
      userID,
    },
    select: {
      id: true,
      title: true,
      goal: true,
      percentage: true,
      progress: true,
      priority: true
    },
    orderBy: [
      {
        priority: 'asc',
      },
      
    ],
  });
};

const getAllSavingGoalsForEmployeesSortedByPriority = async (employeeIds: string[]) => {
  return await db.savingGoal.findMany({
      where: { userID: { in: employeeIds } },
  });
}

const createServiceGoal = async (data: CreateSavingGoal[], userID: string) => {
  const goals = data.map((g) => ({ ...g, userID }));
  return await db.savingGoal.createMany({
    data: goals,
    skipDuplicates: true,
  });
};

const updateSavingGoal = async (data: UpdateSavingGoal, id: bigint) => {
  return await db.savingGoal.update({
    data: data,
    where: {
      id,
    },
  });
};
const aUpdateSavingGoal =  (data: UpdateSavingGoal, id: bigint) => {
  return db.savingGoal.update({
    data: data,
    where: {
      id,
    },
  });
};

const deleteSavingGoal = async (id: bigint) => {
  return await db.savingGoal.delete({
    where: {
      id,
    },
  });
};

export default {
  getSavingGoal,
  getSavingGoals,
  createServiceGoal,
  updateSavingGoal,
  deleteSavingGoal,
  getAllSavingGoalsForEmployeesSortedByPriority,
  aUpdateSavingGoal
} as const;
