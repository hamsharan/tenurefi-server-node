import { hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';

import db from '@src/utils/db';
import SavingGoalService from './SavingGoalService';
import WalletService from './WalletService';
import e from 'cors';

type SpecificGiftRequest = {
    userId: string; // Company owner's ID
    employeeId: string;
    goalId: bigint;
    giftAmount: number;
  };
  type  CreateSavingGoal = {
    title: string;
    goal: number;
    percentage: number;
    priority: number;
  }

  type SpecificGiftResponse = {
    employeeId: string;
    appliedAmount: number;
  };
  
type GiftAllRequest = {
    userId: string;
    giftAmount: number;
}
async function checkWalletAmount(giftAmount:number, wallet: any){
    return wallet.balance >= giftAmount;
}
async function validateWallet(giftAmount:number, userID: string) {
    const wallet = await db.wallet.findUnique({
        where: {
            userID:userID
        }
    });
    if(!wallet) {
        throw new Error('Server Error Wallet');
    }
    console.log(wallet.balance, giftAmount)
    if(await checkWalletAmount(giftAmount, wallet) == false) {
        throw new Error('User has insufficient funds');
    }
    return wallet;
}

async function contributeToSavings({ userId, employeeId, goalId, giftAmount }: SpecificGiftRequest) {
    try{
    const [Owner, Employee] = await Promise.all([
        db.user.findFirst({ where: { id: userId, companyRole: "Owner" } }),
        db.user.findUnique({ where: { id: employeeId, companyRole: "Employee" } })
    ]);

    if (!Owner || !Employee) {
        throw new Error('Owner or Employee not found, or not authorized');
    }

    if (Employee.companyID !== Owner.companyID) {
        throw new Error('Employee does not belong to Owner\'s company');
    }

    // Validate and fetch wallet
    const wallet = await validateWallet(giftAmount, userId);
    if (!wallet) {
        throw new Error('Insufficient funds in wallet or wallet not found');
    }

    const goal = await db.savingGoal.findFirst({
        where: {
            id: goalId,
            userID: employeeId
        }
    });

    if (!goal || goal.progress >= goal.goal) {
        throw new Error('Goal not found, already completed, or does not belong to the specified employee');
    }

    const amountToApply = Math.min(goal.goal - goal.progress, giftAmount);

    // Transaction for updating goal, creating transaction record, and updating wallet
    return db.$transaction(async (transaction) => {
        const updatedGoal = await transaction.savingGoal.update({
            where: { id: goal.id },
            data: { progress: { increment: amountToApply } }
        });

        const transactionRecord = await transaction.transaction.create({
            data: {
                amount: amountToApply,
                method: 'Gift',
                type: 'Credit',
                userID: employeeId,
            }
        });

        const updatedWallet = await transaction.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: amountToApply } }
        });

        return {
            employeeId: employeeId,
            goal: updatedGoal,
            appliedAmount: amountToApply,
            transactionId: transactionRecord.id,
            updatedWalletBalance: updatedWallet.balance
        };
    });
    }catch(error) {
        console.error('An error occurred:', error);
    }
}

async function contributeToAllEmployees({ userId, giftAmount }: GiftAllRequest) {
    try {
        const Owner = await db.user.findFirst({ where: { id: userId, companyRole: "Owner" } });
        if (!Owner) {
            throw new Error('User is not in Company, or is not authorized');
        }
        
        const Employees = await db.user.findMany({ where: { companyRole: "Employee", companyID: Owner.companyID } });
        if (Employees.length === 0) {
            throw new Error('No employees found in the company');
        }
        console.log(Employees)
        const wallet = await validateWallet(Employees.length * giftAmount, userId);

        // Fetch and sort all saving goals for all employees by priority
        let employeeIds = Employees.map(e => e.id);
        const allSavingGoals = await SavingGoalService.getAllSavingGoalsForEmployeesSortedByPriority(employeeIds);

        let total_given = 0;
        let updates = [];
        let count = 0;
        for (const employee of Employees) {
            let balance = giftAmount;
            const savingGoals = allSavingGoals
                                .filter(goal => goal.userID === employee.id)
                                .sort((a, b) => a.priority - b.priority);
            
            for (const goal of savingGoals) {
                if (balance > 0 && goal.progress < goal.goal) {
                    let increment = Math.min(balance, goal.goal - goal.progress);
                    goal.progress += increment;
                    balance -= increment;
                    total_given += increment;

                    // Prepare update operation for saving goal
                    updates.push(SavingGoalService.aUpdateSavingGoal(goal, goal.id));

                    // Prepare a transaction record for each transfer
                    updates.push(db.transaction.create({
                        data: {
                            amount: increment,
                            method: 'Transfer',
                            type: 'Credit',
                            userID: employee.id,
                        }
                    }));
                }
            }
        }

        // Update wallet balance
        wallet.balance -= total_given;
        if (total_given > 0) {
            updates.push(WalletService.updateWallet(wallet, wallet.id));
        }

        // Execute all updates in a single transaction
        await db.$transaction(updates);
        return {
            status: "Success",
            message: "Contributions successfully made to all employees' savings goals.",
            totalAmountDistributed: total_given,
            walletBalanceAfterContributions: wallet.balance
        };
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// export default { contributeToSavings, contributeToAllEmployees };



export default {contributeToSavings, contributeToAllEmployees}
   