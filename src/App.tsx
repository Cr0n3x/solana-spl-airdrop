import React, {FC, useCallback, useEffect, useMemo, useState} from 'react';
import {ConnectionProvider, useConnection, useWallet, WalletProvider} from '@solana/wallet-adapter-react';
import {WalletAdapter, WalletAdapterNetwork} from '@solana/wallet-adapter-base';
import {clusterApiUrl, PublicKey, Transaction} from '@solana/web3.js';
import {PhantomWalletAdapter} from '@solana/wallet-adapter-wallets';
import {WalletModalProvider, WalletMultiButton} from '@solana/wallet-adapter-react-ui';
import {getOrCreateAssociatedTokenAccount} from "./utils/getOrCreateAssociatedTokenAccount";
import {createTransferInstruction} from "./utils/createTransferInstructions";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";


export const Wallet: FC<{ children: any }> = ({children}) => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
        ] as WalletAdapter[],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <div style={{display: 'grid'}}>
                        <div style={{marginBottom: '1rem'}}>
                            <WalletMultiButton/>
                        </div>
                        <div>
                            {children}
                        </div>
                    </div>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

enum DistributionStatus {
    PENDING,
    FAILED,
    COMPLETED,
}

interface DistributionListItem {
    publicKey: string;
    amount: number;
    status: DistributionStatus;
    txn: string | null;
}

const Content: FC = () => {
    const {connection} = useConnection();
    const {publicKey, signTransaction, sendTransaction} = useWallet();
    const [splTokenAddress, setSplTokenAddress] = useState<string>('');
    const [distributionList, setDistributionList] = useState<DistributionListItem[]>([]);
    const [distributionStarted, setDistributionStarted] = useState<boolean>(false);
    const [distributionCompleted, setDistributionCompleted] = useState<boolean>(false);
    const [distributionCount, setDistributionCount] = useState<number>(0);

    useEffect(() => {
        if (distributionList.length > 0) {
            const result = distributionList.filter((entry) => entry.status === DistributionStatus.COMPLETED);
            setDistributionCount(result.length);
        }
    }, [distributionList])

    const sendSplTransaction = useCallback(async (reviver: string, amount: number, mintAddress: string) => {
        if (!reviver || !amount) {
            return Promise.reject();
        }


        try {
            if (!publicKey || !signTransaction) {
                return Promise.reject();
            }
            const toPublicKey = new PublicKey(reviver)
            const mint = new PublicKey(mintAddress)

            const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                publicKey,
                mint,
                publicKey,
                signTransaction
            )

            const toTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                publicKey,
                mint,
                toPublicKey,
                signTransaction
            )

            const transaction = new Transaction().add(
                createTransferInstruction(
                    fromTokenAccount.address,
                    toTokenAccount.address,
                    publicKey,
                    amount, //* LAMPORTS_PER_SOL,
                    [],
                    TOKEN_PROGRAM_ID
                )
            )

            const blockHash = await connection.getRecentBlockhash();

            transaction.feePayer = await publicKey;
            transaction.recentBlockhash = await blockHash.blockhash;

            const signed = await signTransaction(transaction);

            return await connection.sendRawTransaction(signed.serialize());

        } catch (error: any) {
            console.log(`Transaction failed: ${error.message}`)
            return Promise.reject();
        }
    }, [publicKey, sendTransaction, connection]);

    const distributeTokens = async (distributionList: DistributionListItem[]) => {
        const result = []
        for (let i = 0; i < distributionList.length; i++) {
            const distribution = distributionList[i];

            if (distribution.status !== DistributionStatus.COMPLETED) {
                try {
                    const transaction = await sendSplTransaction(distribution.publicKey, distribution.amount, splTokenAddress);
                   result.push({
                            publicKey: distribution.publicKey,
                            amount: distribution.amount,
                            status: DistributionStatus.COMPLETED,
                            txn: transaction,
                        });
                } catch (error) {
                    result.push({
                            publicKey: distribution.publicKey,
                            amount: distribution.amount,
                            status: DistributionStatus.FAILED,
                            txn: null,
                        });
                }
            }

        }

        setDistributionList(result);
    }

    return <>
        {(!distributionStarted && !distributionCompleted) &&
            <form style={{display: 'grid', gap: '1rem', marginBottom: '1rem'}}>
                <label htmlFor={'spl-token-address'}>SPL-Token address:</label>
                <input id={'spl-token-address'}
                       type={'text'}
                       value={splTokenAddress}
                       onChange={(event) => setSplTokenAddress(event.target.value)}/>
                <label htmlFor={'distribution-list'}>Distribution List:</label>
                <input id={'distribution-list'}
                       type={'file'}
                       onChange={(event) => {
                           if (event.target.files) {
                               const reader = new FileReader();

                               reader.onload = (readerEvent) => {
                                   const results: any = readerEvent?.target?.result || null;

                                   if (results) {
                                       setDistributionList(JSON.parse(results).wallets.map((wallet: any) => ({
                                           publicKey: wallet.publicKey,
                                           status: wallet.status || DistributionStatus.PENDING,
                                           amount: wallet.amount || 1,
                                           txn: wallet.txn || null,
                                       })));
                                   }
                               }
                               // @ts-ignore
                               reader.readAsText(event.target.files[0], "UTF-8");
                           }
                       }}/>
            </form>}

        {
            distributionCompleted && <>Distribution completed</>
        }

        {
            distributionList.length > 0 && <button type={'button'} onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();

                setDistributionStarted(true);

                distributeTokens([...distributionList]).then(() => {
                    setDistributionCompleted(true)
                    setDistributionStarted(false);
                }).catch(() => {
                    setDistributionCompleted(false)
                    setDistributionStarted(false);
                })

            }}>Start distribution
            </button>
        }

        {
            distributionCompleted && <button type={'button'} onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();

                setDistributionStarted(true);

                distributeTokens([...distributionList]).then(() => {
                    setDistributionCompleted(true)
                    setDistributionStarted(false);
                }).catch(() => {
                    setDistributionCompleted(false)
                    setDistributionStarted(false);
                })

            }}>Restart distribution
            </button>
        }

        {
            distributionList.length > 0 && <>

                <table>
                    <thead>
                    <tr>
                        <th>Wallet</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Transaction</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        distributionList.map((distribution, key) => (
                            <tr key={key}>
                                <td>{distribution.publicKey}</td>
                                <td>{distribution.amount}</td>
                                <td>{distribution.status === DistributionStatus.COMPLETED ? 'Done' : distribution.status === DistributionStatus.FAILED ? 'Failed' : 'Pending'}</td>
                                <td>{distribution.txn && <a href={`https://solscan.io/tx/${distribution.txn}`}
                                                            target={'_blank'}>Transaction</a>}</td>
                            </tr>
                        ))
                    }
                    </tbody>
                </table>

            </>
        }

    </>
}


export const App: FC = () => {
    return (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <Wallet>
                <Content/>
            </Wallet>
        </div>
    );
}

