import ErrnoException = NodeJS.ErrnoException;

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

const airDrop = () => {
    let log;
    let logfileExits = false;


    if (!fs.existsSync(path.resolve(__dirname, configPath))) {
        console.log('ERROR: No config.json found.');
        return;
    }

    const {
        splTokenAddress,
        privateKeyPath
    }: Config = JSON.parse(fs.readFileSync(path.resolve(__dirname, configPath), fsOptions));

    if (!fs.existsSync(path.resolve(__dirname, distributionPath))) {
        console.log('ERROR: No distribution.json found.');
        return;
    }

    let items = JSON.parse(fs.readFileSync(path.resolve(__dirname, distributionPath), fsOptions));

    if (!fs.existsSync(path.resolve(__dirname, cachePath))) {
        console.log('NO CACHE DIRECTORY FOUND, CREATING NEW DIRECTORY NOW.')
        fs.mkdirSync(path.resolve(__dirname, cachePath));
    }

    if (!fs.existsSync(path.resolve(__dirname, logPath))) {
        fs.writeFileSync(path.resolve(__dirname, logPath), JSON.stringify([]));
        log = [];
        logfileExits = true;
    }

    console.log("Total to run before removing success ones: " + items.length);

    log = logfileExits ? log : JSON.parse(fs.readFileSync(path.resolve(__dirname, logPath), fsOptions));

    for (const item of items) {

        let element = log.find((i: DistributionLog) => {
            return i.publicKey === item.publicKey;
        });

        if (element && element.status === DistributionStatus.DONE) {
            continue;
        }


        let response: DistributionLog = {
            publicKey: '',
            amount: 0,
            status: DistributionStatus.PENDING,
            txn: '',
        }

        const command = `spl-token transfer ${splTokenAddress} ${item.amount} ${item.publicKey} --owner ${privateKeyPath} --allow-unfunded-recipient --fund-recipient`;

        console.log(command);

        try {
            let result = require('child_process').execSync(command);
            response.publicKey = item.publicKey;
            response.amount = item.amount;
            response.txn = result.toString();
            response.status = DistributionStatus.DONE;
            log.push(response);
        } catch (error: any) {
            console.log(`SEND TOKEN FAILED => ${error?.message?.toString() + error?.output?.[2]?.toString()}`);
            response.publicKey = item.publicKey;
            response.amount = item.amount;
            response.status = DistributionStatus.FAILED;
            response.error = `${error?.message?.toString() + error?.output?.[2]?.toString()}`;
            log.push(response);
        }
        fs.writeFileSync(path.resolve(__dirname, logPath), JSON.stringify(log));
    }
}

airDrop();
