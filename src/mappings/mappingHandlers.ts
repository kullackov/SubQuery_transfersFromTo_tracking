import {SubstrateEvent} from "@subql/types";
import {Account, TransferFromTo, TransfersHistory} from "../types";
import {Balance} from "@polkadot/types/interfaces";

async function getAccount(id: string): Promise<Account> {
    let account = await Account.get(id);
    if (account === undefined) {
        account = new Account(id);
        await account.save();
    }
    return account;
}

async function getTransferFromTo(from: Account, to: Account): Promise<TransferFromTo> {
    const id = `${from.id}-${to.id}`;
    let transfer = await TransferFromTo.get(id);
    if (transfer === undefined) {
        transfer = new TransferFromTo(id);
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

    const transferFromTo = await getTransferFromTo(fromAccount, toAccount);
    transferFromTo.count += 1;
    transferFromTo.totalVolume += (balance as Balance).toBigInt();
    transferFromTo.lastTransferDate = blockDate;

    const uniqueId = `${event.block.block.header.number}-${event.idx.toString()}`;

    const transfersHistory = new TransfersHistory(uniqueId);
    transfersHistory.fromToId = transferFromTo.id;
    transfersHistory.count = transferFromTo.count;
    transfersHistory.totalVolume = transferFromTo.totalVolume;
    transfersHistory.blockHeight = blockHeight;
    transfersHistory.date = blockDate;

    await transferFromTo.save();
    await transfersHistory.save();    
}

