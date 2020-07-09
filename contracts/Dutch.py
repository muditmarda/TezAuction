import smartpy as sp

class DutchAuctionFactory(sp.Contract):
    def __init__(self, master_auction_contract, owner):
        self.dutch = DutchAuction()
        self.init(master_auction_contract = master_auction_contract, owner = owner)

    @sp.entry_point
    def setMasterAuctionContractAddress(self, master_auction_contract):
        sp.verify(sp.sender == self.data.owner)
        self.data.master_auction_contract = master_auction_contract

    @sp.entry_point
    def createDutchAuctionInstance(self, asset_id):
        sp.verify(sp.sender == self.data.master_auction_contract)
        
        contract_address = sp.some(sp.create_contract(
            storage = sp.record(owner = sp.source,
                master_auction_contract = self.data.master_auction_contract,
                asset_id = asset_id,
                current_price = 0,
                reserve_price = 0,
                started = sp.bool(False),
                ended = sp.bool(False),
                start_time = sp.now,
                round_time = 0), 
            contract = self.dutch))
        
        # registerInstance
        c = sp.contract(sp.TRecord(asset_id = sp.TNat, contract_address = sp.TAddress),  self.data.master_auction_contract, entry_point = "registerInstance").open_some()
        sp.transfer(sp.record(asset_id = asset_id, contract_address = contract_address.open_some()), sp.mutez(0), c)
        


class DutchAuction(sp.Contract):
    def __init__(self):
        self.init_type(t = sp.TRecord(owner = sp.TAddress,
                master_auction_contract = sp.TAddress,
                asset_id = sp.TNat,
                current_price = sp.TNat,
                reserve_price = sp.TNat,
                started = sp.TBool,
                ended = sp.TBool,
                start_time = sp.TTimestamp,
                round_time = sp.TInt))
                # round_time (gets refreshed for each bid)

    @sp.entry_point
    def configureAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.ended)
        
        self.data.current_price = params.opening_price
        self.data.reserve_price = params.reserve_price
        self.data.start_time = params.start_time
        self.data.round_time = params.round_time
        
        # configureInstance 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "configureInstance").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)

    @sp.entry_point
    def startAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.ended)
        # verify now is less than round_end_time = start_time + round_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))

        self.data.started = sp.bool(True)
        self.data.start_time = sp.now

        # startedAuction 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "startedAuction").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)


    @sp.entry_point
    def dropPrice(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(params.new_price < self.data.current_price)
        sp.verify(params.new_price >= self.data.reserve_price)
        # verify now more than round_end_time = start_time + round_time
        sp.verify(sp.now > self.data.start_time.add_seconds(self.data.round_time))

        self.data.current_price = params.new_price
        self.data.start_time = sp.now

    @sp.entry_point
    def acceptPrice(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(~(sp.sender == self.data.owner))
        sp.verify(sp.amount == sp.mutez(self.data.current_price))
        # verify now less than round_end_time = start_time + round_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))

        sp.send(self.data.owner, sp.amount)

        self.data.owner = sp.sender
        
        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    @sp.entry_point
    def cancelAuction(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(sp.sender == self.data.owner)
        
        self.data.current_price = 0

        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    def endAuction(self, asset_id, owner):
        self.data.ended = sp.bool(True)

        # destroyInstance 
        c = sp.contract(sp.TRecord(asset_id = sp.TNat, owner = sp.TAddress), self.data.master_auction_contract, entry_point = "destroyInstance").open_some()
        sp.transfer(sp.record(asset_id = asset_id, owner = owner), sp.mutez(0), c)



@sp.add_test(name = "Test Auction")
def test():
    # Create test scenario
    scenario = sp.test_scenario()

    # Create HTML output for debugging
    scenario.h1("Dutch Auction Factory")
    
    # Initialize test accounts
    master = sp.address("tz1-master-address-1234")
    owner = sp.address("tz1-owner-address-1234")
    
    # Instantiate Auction contract
    dutchAuctionFactory = DutchAuctionFactory(master_auction_contract = master, owner = owner)
    scenario += dutchAuctionFactory
