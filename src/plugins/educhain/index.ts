import { ethers } from 'ethers';
import type { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import contractJson from './contract.json';

export class Educhain {
  private contract: ethers.Contract;
  private provider: ethers.providers.JsonRpcProvider;

  constructor(private server: FastifyInstance) {
    const contractAbi = contractJson.abi;
    this.provider = new ethers.providers.JsonRpcProvider(this.server.config.EDUCHAIN_RPC_URL);
    const wallet = new ethers.Wallet(this.server.config.EDUCHAIN_PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(
      this.server.config.EDUCHAIN_CONTRACT_ADDRESS,
      contractAbi,
      wallet,
    );
  }

  async getProgram(programId: string) {
    try {
      if (!programId || (!ethers.utils.isHexString(programId) && Number.isNaN(Number(programId)))) {
        throw new Error('Invalid program ID format');
      }

      const program = await this.contract.eduPrograms(programId);
      if (!program || !program.id) {
        throw new Error('Program not found');
      }

      return program;
    } catch (error) {
      this.server.log.error({ error, programId }, 'Failed to retrieve program from blockchain');
      throw new Error('Program not found or blockchain error occurred');
    }
  }

  async createProgram(params: {
    name: string;
    price: string;
    startTime: Date;
    endTime: Date;
    validatorAddress: string;
  }) {
    try {
      // Parameter validation
      if (!params.price || Number.isNaN(Number(params.price)) || Number(params.price) <= 0) {
        throw new Error('Valid positive price is required');
      }

      if (params.startTime >= params.endTime) {
        throw new Error('Start time must be earlier than end time');
      }

      // Current time validation
      const now = new Date();
      if (params.startTime < now) {
        throw new Error('Start time cannot be in the past');
      }

      // Convert price from ETH string to wei
      const price = ethers.utils.parseEther(params.price);

      // Convert dates to Unix timestamps (seconds)
      const startTimestamp = Math.floor(params.startTime.getTime() / 1000);
      const endTimestamp = Math.floor(params.endTime.getTime() / 1000);

      // Ensure validator address is available
      if (!params.validatorAddress) {
        throw new Error('Validator address not configured');
      }

      // Call the smart contract function with proper parameters
      const tx = await this.contract.createEduProgram(
        params.name,
        price,
        startTimestamp,
        endTimestamp,
        params.validatorAddress,
        { value: price },
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Find the ProgramCreated event
      const event = receipt.events.find((e: { event: string }) => e.event === 'ProgramCreated');

      if (!event || !event.args || !event.args[0]) {
        throw new Error('Program creation event not found in transaction receipt');
      }

      // Extract the program ID from the event args
      const programId = event.args[0].toString();
      return programId;
    } catch (error) {
      this.server.log.error({ error, params }, 'Failed to create program on blockchain');
      throw new Error('Program not created due to blockchain error');
    }
  }

  async approveProgram(programId: string, builderAddress: string) {
    try {
      if (!programId || (!ethers.utils.isHexString(programId) && Number.isNaN(Number(programId)))) {
        throw new Error('Invalid program ID format');
      }

      if (!builderAddress) {
        throw new Error('Builder address not configured');
      }

      // Verify the program exists before approving
      const program = await this.getProgram(programId);

      if (program.approve) {
        throw new Error('Program is already approved');
      }

      if (program.claimed) {
        throw new Error('Program is already claimed or reclaimed');
      }

      // Current time validation
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > program.endTime.toNumber()) {
        throw new Error(
          `Program has already ended (End time: ${new Date(program.endTime.toNumber() * 1000).toLocaleString()})`,
        );
      }

      const tx = await this.contract.approveProgram(programId, builderAddress);
      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      this.server.log.error({ error, programId }, 'Failed to approve program on blockchain');
      throw new Error('Program not approved due to blockchain error');
    }
  }

  async claimGrants(programId: string) {
    try {
      if (!programId || (!ethers.utils.isHexString(programId) && Number.isNaN(Number(programId)))) {
        throw new Error('Invalid program ID format');
      }

      if (!this.server.config.EDUCHAIN_BUILDER_PRIVATE_KEY) {
        throw new Error('Builder private key not configured');
      }

      const builderWallet = new ethers.Wallet(
        this.server.config.EDUCHAIN_BUILDER_PRIVATE_KEY,
        this.provider,
      );
      const builderContract = new ethers.Contract(
        this.server.config.EDUCHAIN_CONTRACT_ADDRESS,
        contractJson.abi,
        builderWallet,
      );
      const program = await builderContract.eduPrograms(programId);

      if (builderWallet.address.toLowerCase() !== program.builder.toLowerCase()) {
        throw new Error(
          `The current wallet address (${builderWallet.address}) does not match the builder address registered for the program (${program.builder})`,
        );
      }

      if (!program.approve) {
        throw new Error('This program has not been approved yet');
      }

      if (program.claimed) {
        throw new Error('This program has already been claimed');
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime < program.startTime.toNumber()) {
        throw new Error(
          `The program has not started yet. (Start time: ${new Date(program.startTime.toNumber() * 1000).toLocaleString()})`,
        );
      }

      if (currentTime > program.endTime.toNumber()) {
        throw new Error(
          `The program claim period has passed. (End time: ${new Date(program.endTime.toNumber() * 1000).toLocaleString()})`,
        );
      }

      const tx = await builderContract.claimGrants(programId);
      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      this.server.log.error({ error, programId }, 'Failed to claim program grants on blockchain');
      throw new Error('Program grants not claimed due to blockchain error');
    }
  }
}

const educhainPlugin = (
  server: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: FastifyError) => void,
): void => {
  const educhain = new Educhain(server);
  server.decorate('educhain', educhain);

  done();
};

export default fp(educhainPlugin);
