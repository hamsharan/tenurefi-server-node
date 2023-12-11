import db from '@src/utils/db';

export interface updateWallet {
    balance?: number,
    budget?:number,
    rounding?:number,
}

 function updateWallet(data: updateWallet, id:string) {
    return  db.wallet.update({
        data:data,
        where: {
            id
        }  
    })

}

export default {updateWallet}