import {SubstrateEvent} from "@subql/types";
import {Account, FromToTransfer, TransfersHistory} from "../types";
import {Balance} from "@polkadot/types/interfaces";

async function getAccount(id: string): Promise<Account> {
    let account = await Account.get(id);
    if (account === undefined) {
        account = new Account(id);
        await account.save();
    }
    return account;
}

async function getFromToTransfer(from: Account, to: Account): Promise<FromToTransfer> {
    const id = `${from.id}-${to.id}`;
    let transfer = await FromToTransfer.get(id);
    if (transfer === undefined) {
        transfer = new FromToTransfer(id);
        transfer.fromId = from.id;
        transfer.toId = to.id;
        transfer.count = 0;
        transfer.totalVolume = BigInt(0);
    }
    return transfer;
}

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
    const {event: {data: [eventFromAccount, eventToAccount, balance]}} = event;

    const blockDate = event.block.timestamp;
    const blockHeight = event.block.block.header.number.toNumber();

    const fromAccount = await getAccount(eventFromAccount.toString());
    const toAccount = await getAccount(eventToAccount.toString());

    const fromToTransfer = await getFromToTransfer(fromAccount, toAccount);
    fromToTransfer.count += 1;
    fromToTransfer.totalVolume += (balance as Balance).toBigInt();
    fromToTransfer.lastTransferDate = blockDate;

    const uniqueId = `${event.block.block.header.number}-${event.idx.toString()}`;

    const transfersHistory = new TransfersHistory(uniqueId);
    transfersHistory.fromToId = fromToTransfer.id;
    transfersHistory.count = fromToTransfer.count;
    transfersHistory.totalVolume = fromToTransfer.totalVolume;
    transfersHistory.blockHeight = blockHeight;
    transfersHistory.date = blockDate;

    await fromToTransfer.save();
    await transfersHistory.save();    
}

