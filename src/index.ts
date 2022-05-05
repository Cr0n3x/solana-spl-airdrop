const fs = require('fs');
const path = require('path');

interface Config {
    splTokenAddress: string;
    privateKeyPath: string;
}

enum DistributionStatus {
    PENDING,
    FAILED,
    DONE,
}

interface DistributionLog {
    publicKey: string;
    amount: number;
    status: DistributionStatus;
    txn?: string | undefined;
    error?: string | undefined;
}

const cachePath = '../.cache';
const logPath = '../.cache/distribution.log.json';
const configPath = '../config/config.json';
const distributionPath = '../config/distribution.json';
const fsOptions: { encoding: BufferEncoding, flag?: string | undefined } = {encoding: 'utf8', flag: 'r'};

const setup = (): {
    items: Partial<DistributionLog>[];
    splTokenAddress: string;
    privateKeyPath: string;
    existingLog: DistributionLog[];
} | null => {
    let existingLog: DistributionLog[] = [];

    if (!fs.existsSync(path.resolve(__dirname, configPath))) {
        console.log('ERROR: No config.json found.');
        return null;
    }

    const {
        splTokenAddress,
        privateKeyPath
    }: Config = JSON.parse(fs.readFileSync(path.resolve(__dirname, configPath), fsOptions));

    if (!fs.existsSync(path.resolve(__dirname, distributionPath))) {
        console.log('ERROR: No distribution.json found.');
        return null;
    }

    let items = JSON.parse(fs.readFileSync(path.resolve(__dirname, distributionPath), fsOptions));

    if (!fs.existsSync(path.resolve(__dirname, cachePath))) {
        console.log('NO CACHE DIRECTORY FOUND, CREATING NEW DIRECTORY NOW.')
        fs.mkdirSync(path.resolve(__dirname, cachePath));
    }

    if (!fs.existsSync(path.resolve(__dirname, logPath))) {
        fs.writeFileSync(path.resolve(__dirname, logPath), JSON.stringify([]));
        existingLog = [];
    }

    return {items, splTokenAddress, privateKeyPath, existingLog}

}

const airDrop = () => {
    let log;
    const setupResult = setup();

    if (!setupResult) {
        return;
    }

    const {items, splTokenAddress, privateKeyPath, existingLog} = setupResult;

    console.log(`Starting AirDrop of ${splTokenAddress} to ${items.length} Wallets`);

    log = existingLog.length > 0 ? existingLog : JSON.parse(fs.readFileSync(path.resolve(__dirname, logPath), fsOptions));

    let failedCount = 0;
    let completedCount = 0;
    let completedInPrevRunCount = 0;

    for (const item of items) {

        const completed = log.find((i: DistributionLog) => i.publicKey === item.publicKey && i.status === DistributionStatus.DONE);

        if (completed) {
            completedInPrevRunCount++;
            continue;
        }


        let response: DistributionLog = {
            publicKey: '',
            amount: 0,
            status: DistributionStatus.PENDING,
            txn: '',
        }

        const command = `spl-token transfer ${splTokenAddress} ${item.amount} ${item.publicKey} --owner ${privateKeyPath} --allow-unfunded-recipient --fund-recipient`;

        console.log(`Transferring ${item.amount} tokens of ${splTokenAddress} to ${item.publicKey}`);

        try {
            let result = require('child_process').execSync(command);
            response.publicKey = item.publicKey!;
            response.amount = item.amount!;
            response.txn = result.toString();
            response.status = DistributionStatus.DONE;
            log.push(response);
            completedCount++;
        } catch (error: any) {
            console.log(`SEND TOKEN FAILED => ${error?.message?.toString() + error?.output?.[2]?.toString()}`);
            response.publicKey = item.publicKey!;
            response.amount = item.amount!;
            response.status = DistributionStatus.FAILED;
            response.error = `${error?.message?.toString() + error?.output?.[2]?.toString()}`;
            log.push(response);
            failedCount++;
        }
        fs.writeFileSync(path.resolve(__dirname, logPath), JSON.stringify(log));
    }
    console.log(`AirDrop of ${splTokenAddress} completed. Success: ${completedCount + completedInPrevRunCount} ${completedInPrevRunCount > 0 && `(${completedInPrevRunCount} thereof in previous run)` }, Failed: ${failedCount}`)
    if(failedCount > 0) {
        console.log('Please re run AirDrop command!')
    }
}

airDrop();
