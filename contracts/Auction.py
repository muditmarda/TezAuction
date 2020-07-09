import smartpy as sp

class Auction(sp.Contract):
    
    def __init__(self, owner):
        self.init(counter = 1,
                owner = owner,
                english_factory = owner,
                dutch_factory = owner,
                sealed_bid_factory = owner,
                vickrey_factory = owner,
                instances_map = sp.map(
                    tkey = sp.TNat,
                    tvalue = sp.TRecord(
                        asset_name = sp.TString,
                        auction_type = sp.TString,
                        owner = sp.TAddress,
                        contract_address = sp.TAddress,
                        is_available = sp.TBool)))
    
    # requires owner privileges
    @sp.entry_point
    def saveFactoryAddresses(self, params):
        sp.verify(sp.sender == self.data.owner)
        self.data.english_factory = params.english_factory
        self.data.dutch_factory = params.dutch_factory
        self.data.sealed_bid_factory = params.sealed_bid_factory
        self.data.vickrey_factory = params.vickrey_factory

    @sp.entry_point
    def createInstance(self, params):
        asset_id = sp.local('asset_id', params.asset_id)
        asset_name = sp.local('asset_name', params.asset_name)
        
        sp.if asset_id.value == 0:
            asset_id.value = self.data.counter
            self.data.counter = self.data.counter + 1
        sp.else:
            sp.verify((self.data.instances_map[asset_id.value].owner == sp.sender))
            sp.verify((self.data.instances_map[asset_id.value].is_available), "cannot auction as the asset is unavailable")
            asset_name.value = self.data.instances_map[asset_id.value].asset_name
        
        self.data.instances_map[asset_id.value] = sp.record(
            asset_name = asset_name.value,
            auction_type = params.auction_type,
            owner = sp.sender,
            contract_address = sp.to_address(sp.self),
            is_available = sp.bool(True))
        
        sp.verify(((params.auction_type == "english") | (params.auction_type == "dutch") | (params.auction_type == "sealed bid")), "incorrect auction_type")
        sp.if params.auction_type == "dutch":
            d = sp.contract(sp.TNat, self.data.dutch_factory, entry_point = "createDutchAuctionInstance").open_some()
            sp.transfer(asset_id.value, sp.mutez(0), d)
        sp.if params.auction_type == "english":
            e = sp.contract(sp.TNat, self.data.english_factory, entry_point = "createEnglishAuctionInstance").open_some()
            sp.transfer(asset_id.value, sp.mutez(0), e)        
        sp.if params.auction_type == "sealed bid":
            s = sp.contract(sp.TNat, self.data.sealed_bid_factory, entry_point = "createSealedBidAuctionInstance").open_some()
            sp.transfer(asset_id.value, sp.mutez(0), s)
        sp.if params.auction_type == "vickrey":
            v = sp.contract(sp.TNat, self.data.vickrey_factory, entry_point = "createVickreyAuctionInstance").open_some()
            sp.transfer(asset_id.value, sp.mutez(0), v)        

    # called by factories to register the addresses of the newly created instances
    @sp.entry_point
    def registerInstance(self, params):
        sp.verify(((sp.sender == self.data.english_factory) | (sp.sender == self.data.dutch_factory) | (sp.sender == self.data.sealed_bid_factory) | (sp.sender == self.data.vickrey_factory)), "only factories can register instances")
        self.data.instances_map[params.asset_id].contract_address = params.contract_address

    # called by instance for auction parameter tracking
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

    
@sp.add_test(name = "Test Auction")
def test():
    # Create test scenario
    scenario = sp.test_scenario()

    # Create HTML output for debugging
    scenario.h1("Auction Factory")
    
    # Initialize test owner addresses
    owner = sp.address("tz1-owner-1234")

    # Instantiate Auction contract
    auction = Auction(owner = owner)
    scenario += auction