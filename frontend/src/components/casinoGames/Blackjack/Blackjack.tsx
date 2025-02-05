import { ReactElement, useEffect, useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import { Contract, ethers, Signer } from 'ethers';
import { BlackjackContractAddr, CasinoContractAddr, ChipContractAddr } from '../../../utils/environment';
import BlackjackArtifacts from '../../../artifacts/contracts/Blackjack.sol/Blackjack.json';
import ChipArtifacts from '../../../artifacts/contracts/Chip.sol/Chip.json';
import { Provider } from '../../../utils/provider';
import { BlackjackHand } from '../../../utils/types';
import './Blackjack.css';

export function Blackjack(): ReactElement {
    const context = useWeb3React<Provider>();
    const { library, active } = context;
    const [signer, setSigner] = useState<Signer>();
    const [blackjackContract, setBlackjackContract] = useState<Contract>();
    const [chipContract, setChipContract] = useState<Contract>();
    const [minBet, setMinBet] = useState<number>(1); // not stored in wei
    const [maxBet, setMaxBet] = useState<number>(50);  // not stored in wei
    const [bet, setBet] = useState<number>(1);  // not stored in wei
    const [inProgress, setInProgress] = useState<boolean>(false);
    const [playerTurn, setPlayerTurn] = useState<boolean>(false);
    const [playerHand1, setPlayerHand1] = useState<BlackjackHand>();
    const [playerHand2, setPlayerHand2] = useState<BlackjackHand>();
    const [playerHand3, setPlayerHand3] = useState<BlackjackHand>();
    const [playerHand4, setPlayerHand4] = useState<BlackjackHand>();
    const [dealerHand, setDealerHand] = useState<BlackjackHand>();
    const [roundResult, setRoundResult] = useState<number>(-1);
    const [roundEnd, setRoundEnd] = useState<boolean>(false);

    // Get connected wallet information
    useEffect((): void => {
        if (!library) {
            setSigner(undefined);
            return;
        }

        setSigner(library.getSigner());
    }, [library]);

    // Get Blackjack contract read/write connection
    useEffect((): void => {
        if (blackjackContract || !signer)
            return;

        if (!BlackjackContractAddr)
            return;

        const blackjackContractInstance = new ethers.Contract(BlackjackContractAddr, BlackjackArtifacts.abi, signer);
        setBlackjackContract(blackjackContractInstance);

        console.log("Connected to Blackjack contract.");
    }, [blackjackContract, signer]);

    // Get Chip contract read/write connection
    useEffect((): void => {
        if (chipContract || !signer)
            return;

        if (!ChipContractAddr)
            return;

        const chipContractInstance = new ethers.Contract(ChipContractAddr, ChipArtifacts.abi, signer);
        setChipContract(chipContractInstance);

        console.log("Connected to Chip contract.");
    }, [chipContract, signer]);

    // Get minimum and maximum bet values
    useEffect((): void => {
        async function getMinBet(): Promise<void> {
            if (!blackjackContract)
                return;

            const _minBet = await blackjackContract.getMinimumBet();
            if (_minBet !== minBet) {
                setMinBet(_minBet);
            }
        }

        async function getMaxBet(): Promise<void> {
            if (!blackjackContract) {
                return;
            }

            const _maxBet = await blackjackContract.getMaximumBet();
            if (_maxBet !== maxBet) {
                setMaxBet(_maxBet);
            }
        }

        getMinBet();
        getMaxBet();
    }, []);

    // Event listeners for Blackjack events
    const contractPaidEvent = (player: string, amount: Number): void => {
        console.log("Contract Paid Event:");
        console.log(player);
        console.log(amount);
    }
    const playerCardsUpdatedEvent = (player: string, hand1: BlackjackHand, hand2: BlackjackHand, hand3: BlackjackHand, hand4: BlackjackHand, numHands: Number): void => {
        console.log("Player Cards Updated.");
        const newPlayerHand1: BlackjackHand = hand1;
        const newPlayerHand2: BlackjackHand = hand2;
        const newPlayerHand3: BlackjackHand = hand3;
        const newPlayerHand4: BlackjackHand = hand4;
        setPlayerHand1(newPlayerHand1);
        setPlayerHand2(newPlayerHand2);
        setPlayerHand3(newPlayerHand3);
        setPlayerHand4(newPlayerHand4);
        console.log("Number of player hands: " + numHands);
    }
    const dealerCardsUpdatedEvent = (player: string, hand: BlackjackHand): void => {
        console.log("Dealer Cards Updated.");
        const newDealerHand: BlackjackHand = hand;
        setDealerHand(newDealerHand);
    }
    const playerTurnEndEvent = (player: string): void => {
        console.log("Player Turn Ended.");
        setPlayerTurn(false);
    }
    const playerBlackjackEvent = (player: string): void => {
        console.log("Player has Blackjack!");
    }
    const dealerBlackjackEvent = (player: string): void => {
        console.log("Dealer has Blackjack!");
    }
    const roundResultEvent = (player: string, payout: string): void => {
        const roundRes = Number(BigInt(payout) / BigInt("1000000000000000000")).valueOf();
        setRoundResult(roundRes);
        // setPlayerTurn(false);
        setRoundEnd(true);
        console.log("Round result payout: " + roundRes);
    }
    useEffect((): () => void => {
        let wallet;
        async function getWalletAddress(): Promise<void> {
            if(!signer)
                return;
            const _wallet: string = await signer?.getAddress();
            wallet = _wallet;
        }

        getWalletAddress();
        blackjackContract?.on(blackjackContract?.filters.ContractPaid(wallet, null), contractPaidEvent);
        blackjackContract?.on(blackjackContract?.filters.PlayerCardsUpdated(wallet, null, null, null, null), playerCardsUpdatedEvent);
        blackjackContract?.on(blackjackContract?.filters.DealerCardsUpdated(wallet, null), dealerCardsUpdatedEvent);
        blackjackContract?.on(blackjackContract?.filters.PlayerTurnEnd(wallet), playerTurnEndEvent);
        blackjackContract?.on(blackjackContract?.filters.PlayerBlackjack(wallet), playerBlackjackEvent);
        blackjackContract?.on(blackjackContract?.filters.DealerBlackjack(wallet), dealerBlackjackEvent);
        blackjackContract?.on(blackjackContract?.filters.RoundResult(wallet, null), roundResultEvent);

        return () => {
            blackjackContract?.off('ContractPaid', contractPaidEvent);
            blackjackContract?.off('PlayerCardsUpdated', playerCardsUpdatedEvent);
            blackjackContract?.off('DealerCardsUpdated', dealerCardsUpdatedEvent);
            blackjackContract?.off('PlayerTurnEnd', playerTurnEndEvent);
            blackjackContract?.off('PlayerBlackjack', playerBlackjackEvent);
            blackjackContract?.off('DealerBlackjack', dealerBlackjackEvent);
            blackjackContract?.off('RoundResult', roundResultEvent);
        };
    }, [blackjackContract, signer]);

    // Handle "Play Round" button click
    async function handlePlayRound(): Promise<void> {
        if (!blackjackContract || !chipContract)
            return;

        if (bet < minBet || bet > maxBet) {
            window.alert('Error!\n\nBet must be between ' +  minBet + ' and ' + maxBet + '.');
            return;
        }

        const weiBet: string = bet.toString() + "000000000000000000"; // Convert bet to wei
        // First approve contract to take CHIPs on user's behalf
        try {
            const approveTxn = await chipContract.approve(CasinoContractAddr, weiBet); 
            await approveTxn.wait();
        } catch (error: any) {
            window.alert('Error!' + (error && error.message ? `\n\n${error.message}` : ''));
        }

        // Then call playRound function
        try {
            const playRoundTxn = await blackjackContract.playRound(weiBet);
            await playRoundTxn.wait();
        } catch (error: any) {
            window.alert('Error!' + (error && error.message ? `\n\n${error.message}` : ''));
        }

        setInProgress(true);
        setPlayerTurn(true);
    }

    async function handleHitPlayer(): Promise<void> {
        if(!blackjackContract)
            return;

        if(!playerTurn) {
            window.alert('Error!\n\nIt is no longer your turn!');
            return;
        }

        try {
            const hitPlayerTxn = await blackjackContract.hitPlayer(0);
            await hitPlayerTxn.wait();
        } catch (error: any) {
            window.alert('Error!' + (error && error.message ? `\n\n${error.message}` : ''));
        }
    }

    async function handleStandPlayer(): Promise<void> {
        if(!blackjackContract)
            return;

        if(!playerTurn) {
            window.alert('Error!\n\nIt is no longer your turn!');
            return;
        }

        try {
            const standPlayerTxn = await blackjackContract.standPlayer();
            await standPlayerTxn.wait();
        } catch (error: any) {
            window.alert('Error!' + (error && error.message ? `\n\n${error.message}` : ''));
        }
    }

    const handleIncreaseBet = () => {
        if(bet + 1 <= maxBet) {
            const newBet = bet + 1;
            setBet(newBet);
        }
    }

    const handleDecreaseBet = () => {
        if(bet - 1 >= minBet) {
            const newBet = bet - 1;
            setBet(newBet);
        }
    }

    // Reset states
    const handlePlayAgain = () => {
        setInProgress(false);
        setBet(minBet);
        setPlayerHand1(undefined);
        setPlayerHand2(undefined);
        setPlayerHand3(undefined);
        setPlayerHand4(undefined);
        setDealerHand(undefined);
        setRoundResult(-1);
        setRoundEnd(false);
    }

    return (
        <div>
            <h1>Blackjack Page</h1>
            <h3>Total Bet: {bet}</h3>
            {!inProgress ? 
                <div>
                    <div>
                        {bet > minBet ? <button className="game-btn btn-dec" onClick={handleDecreaseBet}>↓</button> : <></>}
                        {bet < maxBet ? <button className="game-btn btn-inc" onClick={handleIncreaseBet}>↑</button> : <></>}
                    </div>
                    <button
                        disabled={!active || !blackjackContract ? true : false}
                        style={{
                            cursor: !active || !blackjackContract ? 'not-allowed' : 'pointer',
                            borderColor: !active || !blackjackContract ? 'unset' : 'blue'
                        }}
                        onClick={handlePlayRound}
                    >
                        Play Round
                    </button>
                </div>
            : <></>
            }
            {playerTurn ? 
                <div>
                    <button
                        disabled={!active || !blackjackContract ? true : false}
                        style={{
                            cursor: !active || !blackjackContract ? 'not-allowed' : 'pointer',
                            borderColor: !active || !blackjackContract ? 'unset' : 'blue'
                        }}
                        onClick={handleHitPlayer}
                    >
                        Hit
                    </button>
                    <button
                        disabled={!active || !blackjackContract ? true : false}
                        style={{
                            cursor: !active || !blackjackContract ? 'not-allowed' : 'pointer',
                            borderColor: !active || !blackjackContract ? 'unset' : 'blue'
                        }}
                        onClick={handleStandPlayer}
                    >
                        Stand
                    </button>
                </div>
            : <></>
            }
            {playerHand1 && inProgress ? <h4>Player Hand</h4> : <></>}
            {playerHand1 && playerHand1.cSuits && playerHand1.cVals && inProgress ? 
                playerHand1.cVals.map((cardVal, i) => {
                    return (<p key={i}>Card {i}: {cardVal} of {playerHand1.cSuits[i]}</p>);
                })
                : <></>}     
            {playerHand1 && inProgress ? <h4>Dealer Hand</h4> : <></>}
            {dealerHand && dealerHand.cSuits && dealerHand.cVals && inProgress ? 
                dealerHand.cVals.map((cardVal, i) => {
                    return (<p key={i}>Card {i}: {cardVal} of {dealerHand.cSuits[i]}</p>);
                })
                : <></>}
            {roundResult > -1 && roundEnd ?
                <div>
                    {roundResult > bet ? <span><h2>You Win! 🎉</h2><h3>{roundResult-bet} CHIPs</h3><p>(+{bet} back)</p></span> : roundResult < bet ? <h2>You Lose! 💸</h2> : <h2>Tie! 🤝</h2>}
                    <button onClick={handlePlayAgain}>Play Again</button>
                </div> : <></>
            }
        </div>
    );
}

export default Blackjack;