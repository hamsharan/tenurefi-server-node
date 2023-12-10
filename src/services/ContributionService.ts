import { hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';

import db from '@src/utils/db';


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
async function contributeToSavings({ userId, employeeId, goalId, giftAmount }:SpecificGiftRequest ) {
    const Owner = await db.user.findFirst({where: {id: userId, companyRole: "Owner"}});
    if(!Owner) {
        throw new Error('User is not in Company, or is not authorized');
    }
    
    const goal = await db.savingGoal.findFirst({
        where: {
            id:goalId,
            userID: employeeId
        }
    })

    if(!goal) {
        throw new Error('Goal not found or does not belong to the specified employee');
    }

    const amountToApply = Math.min(goal.goal,giftAmount)

   return  db.$transaction(async (db) => {
        const updatedGoal = await db.savingGoal.update({
          where: { id: goal.id },
          data: { goal: { decrement: amountToApply } }
        });
    
        const transaction = await db.transaction.create({
          data: {
            amount: amountToApply,
            method: 'Gift',
            type: 'Credit',
            userID: employeeId,
            // Add any other relevant fielxxsds for the transaction model
          }
        });
    
        return {
          employeeId: employeeId,
          goal: updatedGoal,
          appliedAmount: amountToApply,
          transactionId: transaction.id // Optionally include transaction ID in response
        };
      });
}

async function contributeToAllEmployees({userId, giftAmount}: GiftAllRequest) {
    const Owner = await db.user.findFirst({where: {id: userId, companyRole: "Owner"}});
    if(!Owner) {
        throw new Error('User is not in Company, or is not authorized');
    }
    
    const Employees = await db.user.findMany({where: {companyRole: "Employee", companyID: Owner.companyID}});

    // return db.$transaction(async(db) => {
    //     let returnValue = []
    //     // for(let i in Employees) {  
    //     //     db.savingGoal.findMany({where: {userID = i.id} })
    //     // }
    // }
    // )
    for(let i in Employees) {
        console.log(i)
    }
    return "OK"
    
}


export default {contributeToSavings, contributeToAllEmployees}
   