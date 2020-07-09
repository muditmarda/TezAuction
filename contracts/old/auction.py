import smartpy as sp

class Auction(sp.Contract):
    def __init__(self):
        self.english = EnglishAuction()
        self.dutch = DutchAuction()
        # self.sealed_bid = SealedBidAuction()
        # TODO: create seperate counters for asset and auction. Current counter is for asset.
        # TODO: is_available okay ?
        self.init(counter = 1, 
                instances_map = sp.map(
                    tkey = sp.TNat,
                    tvalue = sp.TRecord(
                        asset_name = sp.TString,
                        auction_type = sp.TString,
                        owner = sp.TAddress,
                        contract_address = sp.TAddress,
                        is_available = sp.TBool)))

    @sp.entry_point
    def createInstance(self, params):
        asset_id = sp.local('asset_id', params.asset_id)
        asset_name = sp.local('asset_name', params.asset_name)
        
        sp.if asset_id.value == 0:
            asset_id.value = self.data.counter
            self.data.counter = self.data.counter + 1
        sp.else:
            sp.verify(self.data.instances_map[asset_id.value].is_available)
            asset_name.value = self.data.instances_map[asset_id.value].asset_name
        
        sp.verify((params.auction_type == "english") | (params.auction_type == "dutch") | (params.auction_type == "sealed bid"))
        sp.if params.auction_type == "dutch":
            self.createDutchAuctionInstance(asset_id.value, asset_name.value)
        sp.if params.auction_type == "english":
            self.createEnglishAuctionInstance(asset_id.value, asset_name.value)
        # sp.if params.auction_type == "sealed bid":
        #     self.createSealedBidAuctionInstance(asset_id.value, asset_name.value)

    def createEnglishAuctionInstance(self, asset_id, asset_name):
        contract_address = sp.some(sp.create_contract(
            storage = sp.record(owner = sp.sender,
                master_auction_contract = sp.to_address(sp.self),
                asset_id = asset_id,
                current_bid = sp.mutez(0),
                min_increase = 0,
                highest_bidder = sp.sender,
                started = sp.bool(False),
                ended = sp.bool(False),
                start_time = sp.now,
                wait_time = 0), 
            contract = self.english))
        self.data.instances_map[asset_id] = sp.record(
            asset_name = asset_name,
            auction_type = "english",
            owner = sp.sender,
            contract_address = contract_address.open_some(),
            is_available = sp.bool(True))

    def createDutchAuctionInstance(self, asset_id, asset_name):
        contract_address = sp.create_contract(
            storage = sp.record(owner = sp.sender,
                master_auction_contract = sp.to_address(sp.self),
                asset_id = asset_id,
                current_price = 0,
                reserve_price = 0,
                started = sp.bool(False),
                ended = sp.bool(False),
                start_time = sp.now,
                wait_time = 0), 
            contract = self.dutch)
        self.data.instances_map[asset_id] = sp.record(
            asset_name = asset_name,
            auction_type = "dutch",
            owner = sp.sender,
            contract_address = contract_address,
            is_available = sp.bool(True))

    # def createSealedBidAuctionInstance(self, asset_id, asset_name):
    #     contract_address = sp.create_contract(
    #         storage = sp.record(owner = sp.sender,
    #             master_auction_contract = sp.to_address(sp.self),
    #             asset_id = asset_id,
    #             participation_fee = 0,
    #             sealed_bids = sp.map(), # sp.TAddress, sp.TString
    #             revealed_count = 0,
    #             highest_bid = sp.mutez(0),
    #             highest_bidder = sp.sender,
    #             started = sp.bool(False),
    #             first_revealed = sp.bool(False),
    #             ended = sp.bool(False),
    #             start_time = sp.now,
    #             round_time = 0), 
    #         contract = self.sealed_bid)
    #     self.data.instances_map[asset_id] = sp.record(
    #         asset_name = asset_name,
    #         auction_type = "sealed bid",
    #         owner = sp.sender,
    #         contract_address = contract_address,
    #         is_available = sp.bool(True))

    @sp.entry_point
    def configureInstance(self, params):
        sp.verify(sp.sender == self.data.instances_map[params.asset_id].contract_address)

    @sp.entry_point
    def startedAuction(self, params):
        sp.verify(sp.sender == self.data.instances_map[params.asset_id].contract_address)
        self.data.instances_map[params.asset_id].is_available = sp.bool(False)

    @sp.entry_point
    def destroyInstance(self, params):
        sp.verify(sp.sender == self.data.instances_map[params.asset_id].contract_address)
        self.data.instances_map[params.asset_id].is_available = sp.bool(True)
        self.data.instances_map[params.asset_id].owner = params.owner

    @sp.entry_point
    def transferOwnership(self, params):
        sp.verify(sp.sender == self.data.instances_map[params.asset_id].owner)
        sp.verify(self.data.instances_map[params.asset_id].is_available)
        
        self.data.instances_map[params.asset_id].owner = params.new_owner



class EnglishAuction(sp.Contract):
    def __init__(self):
        self.init_type(t = sp.TRecord(owner = sp.TAddress,
                master_auction_contract = sp.TAddress,
                asset_id = sp.TNat,
                current_bid = sp.TMutez,
                min_increase = sp.TNat,
                highest_bidder = sp.TAddress,
                started = sp.TBool,
                ended = sp.TBool,
                start_time = sp.TTimestamp,
                wait_time = sp.TInt))
                # wait_time (gets refreshed for each bid) 

    @sp.entry_point
    def configureAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(params.start_time > sp.now)

        self.data.current_bid = sp.mutez(params.reserve_price)
        self.data.min_increase = params.min_increase
        self.data.start_time = params.start_time
        self.data.wait_time = params.wait_time
        
        # configureInstance 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "configureInstance").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)

    @sp.entry_point
    def startAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.ended)
        # verify now is less than end_time = start_time + wait_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.wait_time))

        self.data.started = sp.bool(True)
        self.data.start_time = sp.now

        # startedAuction 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "startedAuction").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)

    @sp.entry_point
    def bid(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(sp.amount - self.data.current_bid >= sp.mutez(self.data.min_increase))
        # check if self.data.highest_bidder exists, then
        sp.verify(~(self.data.highest_bidder == sp.sender))
        # verify now is less than end_time = start_time + wait_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.wait_time))
        
        # if owner != highest_bidder then send current_bid to highest_bidder
        sp.send(self.data.highest_bidder, self.data.current_bid)
        self.data.current_bid = sp.amount
        self.data.highest_bidder = sp.sender
        self.data.start_time = sp.now

    @sp.entry_point
    def resolveAuction(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify((sp.sender == self.data.highest_bidder) | (sp.sender == self.data.owner))
        # verify now more than end_time = start_time + wait_time
        sp.verify(sp.now > self.data.start_time.add_seconds(self.data.wait_time))

        # send current_bid to it's bidder (the current owner)
        sp.send(self.data.owner, self.data.current_bid)
        
        # Let current_bid remain as last price?
        # self.data.current_bid = sp.mutez(0)
        
        # TODO: Ensure cannot be restarted by owner 
        self.data.ended = sp.bool(True)
        self.data.owner = self.data.highest_bidder
        
        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    @sp.entry_point
    def cancelAuction(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(sp.sender == self.data.owner)
        # TODO
        # verify now is less/more than end_time = start_time + wait_time
        # sp.verify(sp.now > self.data.start_time.add_seconds(self.data.wait_time))
        
        # send current_bid to highest_bidder
        sp.if ~(self.data.owner == self.data.highest_bidder) :
            sp.send(self.data.highest_bidder, self.data.current_bid)

        self.data.ended = sp.bool(True)
        self.data.current_bid = sp.mutez(0)
        self.data.highest_bidder = sp.sender
        
        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    def endAuction(self, asset_id, owner):
        # destroyInstance 
        c = sp.contract(sp.TRecord(asset_id = sp.TNat, owner = sp.TAddress), self.data.master_auction_contract, entry_point = "destroyInstance").open_some()
        sp.transfer(sp.record(asset_id = asset_id, owner = owner), sp.mutez(0), c)



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
                wait_time = sp.TInt))
                # wait_time (gets refreshed for each bid) or end_time (after which the auction ends)

    @sp.entry_point
    def configureAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.ended)
        
        self.data.current_price = params.opening_price
        self.data.reserve_price = params.reserve_price
        self.data.start_time = params.start_time
        self.data.wait_time = params.wait_time
        
        # configureInstance 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "configureInstance").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)

    @sp.entry_point
    def startAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.ended)
        # verify now is less than end_time = start_time + wait_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.wait_time))

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
        # verify now more than end_time = start_time + wait_time
        sp.verify(sp.now > self.data.start_time.add_seconds(self.data.wait_time))

        self.data.current_price = params.new_price

    @sp.entry_point
    def acceptPrice(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(~(sp.sender == self.data.owner))
        sp.verify(sp.amount == sp.mutez(self.data.current_price))
        # verify now less than end_time = start_time + wait_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.wait_time))

        sp.send(self.data.owner, sp.amount)

        self.data.ended = sp.bool(True)
        self.data.owner = sp.sender
        
        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    @sp.entry_point
    def cancelAuction(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(sp.sender == self.data.owner)
        #TODO
        # verify now more/less than end_time = start_time + wait_time
        sp.verify(sp.now > self.data.start_time.add_seconds(self.data.wait_time))
        
        self.data.ended = sp.bool(True)
        self.data.current_price = 0

        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    def endAuction(self, asset_id, owner):
        # destroyInstance 
        c = sp.contract(sp.TRecord(asset_id = sp.TNat, owner = sp.TAddress), self.data.master_auction_contract, entry_point = "destroyInstance").open_some()
        sp.transfer(sp.record(asset_id = asset_id, owner = owner), sp.mutez(0), c)



# class SealedBidAuction(sp.Contract):
#     def __init__(self):
#         self.init_type(t = sp.TRecord(owner = sp.TAddress,
#                 master_auction_contract = sp.TAddress,
#                 asset_id = sp.TNat,
#                 participation_fee = sp.TNat,
#                 sealed_bids = sp.TMap(sp.TAddress, sp.TBytes),
#                 revealed_count = sp.TNat,
#                 highest_bid = sp.TMutez,
#                 highest_bidder = sp.TAddress,
#                 started = sp.TBool,
#                 first_revealed = sp.TBool,
#                 ended = sp.TBool,
#                 start_time = sp.TTimestamp,
#                 round_time = sp.TInt))
#                 # wait_time (gets refreshed for each bid) or end_time (after which the auction ends)

#     @sp.entry_point
#     def configureAuction(self, params): 
#         sp.verify(sp.sender == self.data.owner)
#         sp.verify(~self.data.started)
#         sp.verify(~self.data.first_revealed)
#         sp.verify(~self.data.ended)
        
#         self.data.participation_fee = params.participation_fee
#         self.data.start_time = params.start_time
#         self.data.round_time = params.round_time
        
#         # configureInstance 
#         c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "configureInstance").open_some()
#         sp.transfer(self.data.asset_id, sp.mutez(0), c)

#     @sp.entry_point
#     def startAuction(self, params): 
#         sp.verify(sp.sender == self.data.owner)
#         sp.verify(~self.data.started)
#         sp.verify(~self.data.first_revealed)
#         sp.verify(~self.data.ended)
#         # verify now is less than end_time = start_time + wait_time
#         sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))

#         self.data.started = sp.bool(True)
#         self.data.start_time = sp.now

#         # startedAuction 
#         c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "startedAuction").open_some()
#         sp.transfer(self.data.asset_id, sp.mutez(0), c)

#     @sp.entry_point
#     def submitSealedBid(self, params):
#         sp.verify(self.data.started)
#         sp.verify(~self.data.first_revealed)
#         sp.verify(~self.data.ended)
#         # verify now is less than end_time = start_time + wait_time
#         sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))
#         sp.verify(sp.amount == sp.mutez(self.data.participation_fee))

#         self.data.sealed_bids[sp.sender] = params.sealed_bid

#     @sp.entry_point
#     def revealBid(self, params):
#         sp.verify(self.data.started)
#         sp.verify(~self.data.ended)
#         # verify now is more than round end time = start_time + round_time but less than start time + twice of round time
#         sp.verify(sp.now > self.data.start_time.add_seconds(self.data.round_time))
#         sp.verify(sp.now < self.data.start_time.add_seconds(2 * self.data.round_time))
#         sp.verify(sp.mutez(params.value) == sp.amount)
#         sp.verify(sp.sha256(sp.pack(params.value)) == self.data.sealed_bids[sp.sender])
#         sp.if ~self.data.first_revealed:
#             self.data.first_revealed = sp.bool(True)
        
#         self.data.revealed_count += 1
#         sp.if (sp.amount > self.data.highest_bid):
#             self.data.highest_bid = sp.amount
#             self.data.highest_bidder = sp.sender

#     @sp.entry_point
#     def resolveAuction(self, params):
#         sp.verify(self.data.started)
#         sp.verify(self.data.first_revealed)
#         sp.verify(~self.data.ended)
#         sp.verify(self.data.sealed_bids.contains(sp.sender))
#         sp.verify((self.data.revealed_count == sp.len(self.data.sealed_bids)) | (sp.now > self.data.start_time.add_seconds(2 * self.data.round_time)))

#         self.data.ended = sp.bool(True)
#         # refund participation fee
        
#         # endAuction
#         self.endAuction(self.data.asset_id, self.data.owner)

#     @sp.entry_point
#     def cancelAuction(self, params):
#         sp.verify(self.data.started)
#         sp.verify(~self.data.first_revealed)
#         sp.verify(~self.data.ended)
#         sp.verify(sp.sender == self.data.owner)

#         self.data.ended = sp.bool(True)

#         # refund participation fee

#         # endAuction
#         self.endAuction(self.data.asset_id, self.data.owner)

#     def endAuction(self, asset_id, owner):
#         # destroyInstance 
#         c = sp.contract(sp.TRecord(asset_id = sp.TNat, owner = sp.TAddress), self.data.master_auction_contract, entry_point = "destroyInstance").open_some()
#         sp.transfer(sp.record(asset_id = asset_id, owner = owner), sp.mutez(0), c)



@sp.add_test(name = "Test Auction")
def test():
    scenario = sp.test_scenario()

    # Create HTML output for debugging
    scenario.h1("Auction Factory")
    
    # Initialize test owner addresses
    initial_owner = sp.address("tz1-owner-address-1234")

    # Instantiate Auction contract
    auction = Auction()
    scenario += auction
    
    scenario += auction.createInstance(asset_id = 0, asset_name = "Hi", auction_type="english").run(sender = initial_owner)
