#!/usr/bin/env python3
"""
Comprehensive endpoint testing script for D&D Kids Resources API.
Tests all 53 API endpoints across 8 groups.
"""

import requests
import json
import sys
import time
from datetime import datetime
from collections import defaultdict

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"
TEST_TIMEOUT = 10

# Test data storage
test_results = {
    "Group 1: Read-Only Endpoints": [],
    "Group 2: Read with Pagination/Search": [],
    "Group 3: Get by ID/Title": [],
    "Group 4: Create Operations": [],
    "Group 5: Update Operations": [],
    "Group 6: Delete Operations": [],
    "Group 7: Player Nested Resources": [],
    "Group 8: Special Methods": []
}

created_ids = {}  # Store IDs of created items for later tests

def log_test(group, endpoint, method, status, response_code, details=""):
    """Log a test result"""
    result = {
        "endpoint": endpoint,
        "method": method,
        "status": status,
        "response_code": response_code,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    test_results[group].append(result)
    symbol = "✓" if status == "PASS" else "✗"
    print(f"  {symbol} {method:6} {endpoint:40} [{response_code}] {status}")
    if details:
        print(f"      Details: {details}")
    return result

def test_endpoint(group, endpoint, method="GET", data=None, expected_codes=[200, 201]):
    """Test an API endpoint"""
    url = f"{API_BASE}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=TEST_TIMEOUT)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=TEST_TIMEOUT)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=TEST_TIMEOUT)
        elif method == "DELETE":
            response = requests.delete(url, timeout=TEST_TIMEOUT)
        else:
            log_test(group, endpoint, method, "FAIL", 0, f"Unknown method: {method}")
            return None

        status = "PASS" if response.status_code in expected_codes else "FAIL"
        details = ""
        
        try:
            if response.text:
                response_data = response.json()
                if isinstance(response_data, dict) and "error" in response_data:
                    details = response_data.get("error", "")
                elif isinstance(response_data, dict) and len(response_data) > 0:
                    details = f"Response keys: {list(response_data.keys())[:3]}"
                elif isinstance(response_data, list):
                    details = f"Array with {len(response_data)} items"
        except:
            details = f"Response size: {len(response.text)} bytes"
        
        log_test(group, endpoint, method, status, response.status_code, details)
        return response
    except requests.exceptions.ConnectionError:
        log_test(group, endpoint, method, "FAIL", 0, "Connection refused - server not running?")
        return None
    except requests.exceptions.Timeout:
        log_test(group, endpoint, method, "FAIL", 0, "Request timeout")
        return None
    except Exception as e:
        log_test(group, endpoint, method, "FAIL", 0, str(e))
        return None

def run_tests():
    """Run all endpoint tests"""
    print("\n" + "="*80)
    print("D&D Kids Resources - API Endpoint Testing")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80 + "\n")
    
    # Wait for server
    print("Waiting for server to respond...")
    for i in range(15):
        try:
            response = requests.get(f"{API_BASE}/classes", timeout=2)
            print("✓ Server is responding\n")
            break
        except:
            if i < 14:
                print(f"  Attempt {i+1}/15... server not ready yet")
                time.sleep(1)
            else:
                print("✗ Server failed to respond after 15 seconds")
                sys.exit(1)
    
    # ===== GROUP 1: Read-Only Endpoints =====
    print("GROUP 1: Read-Only Endpoints")
    print("-" * 80)
    group = "Group 1: Read-Only Endpoints"
    test_endpoint(group, "/classes", "GET")
    test_endpoint(group, "/abilities", "GET")
    test_endpoint(group, "/spell-components", "GET")
    test_endpoint(group, "/skills", "GET")
    test_endpoint(group, "/conditions", "GET")
    test_endpoint(group, "/weapons", "GET")
    
    # ===== GROUP 2: Read with Pagination/Search =====
    print("\nGROUP 2: Read with Pagination/Search")
    print("-" * 80)
    group = "Group 2: Read with Pagination/Search"
    
    # Get monsters
    resp = test_endpoint(group, "/monsters", "GET")
    if resp and resp.status_code == 200:
        try:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                monster_name = data[0].get("title", data[0].get("name", ""))
                if monster_name:
                    # Test with search
                    test_endpoint(group, f"/monsters?q=goblin&page=1&per_page=10", "GET")
                    created_ids["monster"] = monster_name
        except:
            pass
    
    test_endpoint(group, "/spells", "GET")
    test_endpoint(group, "/traps", "GET")
    test_endpoint(group, "/encounters", "GET")
    test_endpoint(group, "/npcs", "GET")
    test_endpoint(group, "/quests", "GET")
    test_endpoint(group, "/dungeons", "GET")
    test_endpoint(group, "/players", "GET")
    
    # ===== GROUP 3: Get by ID/Title =====
    print("\nGROUP 3: Get by ID/Title")
    print("-" * 80)
    group = "Group 3: Get by ID/Title"
    
    # Test by title
    test_endpoint(group, "/monsters/Goblin", "GET", expected_codes=[200, 404])
    test_endpoint(group, "/skills/Acrobatics", "GET", expected_codes=[200, 404])
    test_endpoint(group, "/conditions/Poisoned", "GET", expected_codes=[200, 404])
    test_endpoint(group, "/weapons/Sword", "GET", expected_codes=[200, 404])
    
    # Get actual IDs for ID-based tests
    resp = test_endpoint(group, "/npcs", "GET")
    if resp and resp.status_code == 200:
        try:
            npcs = resp.json()
            if isinstance(npcs, list) and len(npcs) > 0:
                npc_id = npcs[0].get("id")
                if npc_id:
                    created_ids["npc_id"] = npc_id
                    test_endpoint(group, f"/npcs/{npc_id}", "GET")
        except:
            pass
    
    resp = test_endpoint(group, "/spells", "GET")
    if resp and resp.status_code == 200:
        try:
            spells = resp.json()
            if isinstance(spells, list) and len(spells) > 0:
                spell_id = spells[0].get("id")
                if spell_id:
                    created_ids["spell_id"] = spell_id
                    test_endpoint(group, f"/spells/{spell_id}", "GET")
        except:
            pass
    
    resp = test_endpoint(group, "/quests", "GET")
    if resp and resp.status_code == 200:
        try:
            quests = resp.json()
            if isinstance(quests, list) and len(quests) > 0:
                quest_id = quests[0].get("id")
                if quest_id:
                    created_ids["quest_id"] = quest_id
                    test_endpoint(group, f"/quests/{quest_id}", "GET")
        except:
            pass
    
    resp = test_endpoint(group, "/dungeons", "GET")
    if resp and resp.status_code == 200:
        try:
            dungeons = resp.json()
            if isinstance(dungeons, list) and len(dungeons) > 0:
                dungeon_id = dungeons[0].get("id")
                if dungeon_id:
                    created_ids["dungeon_id"] = dungeon_id
                    test_endpoint(group, f"/dungeons/{dungeon_id}", "GET")
        except:
            pass
    
    resp = test_endpoint(group, "/traps", "GET")
    if resp and resp.status_code == 200:
        try:
            traps = resp.json()
            if isinstance(traps, list) and len(traps) > 0:
                trap_id = traps[0].get("id")
                if trap_id:
                    created_ids["trap_id"] = trap_id
                    test_endpoint(group, f"/traps/{trap_id}", "GET")
        except:
            pass
    
    # ===== GROUP 4: Create Operations =====
    print("\nGROUP 4: Create Operations")
    print("-" * 80)
    group = "Group 4: Create Operations"
    
    # Create NPC
    npc_data = {"name": "Test NPC", "description": "Testing endpoint", "role": "Merchant"}
    resp = test_endpoint(group, "/npcs", "POST", npc_data, [200, 201])
    if resp and resp.status_code in [200, 201]:
        try:
            npc = resp.json()
            if isinstance(npc, dict) and "id" in npc:
                created_ids["new_npc_id"] = npc["id"]
        except:
            pass
    
    # Create Quest
    quest_data = {"name": "Test Quest", "description": "Testing endpoint", "level": 3}
    resp = test_endpoint(group, "/quests", "POST", quest_data, [200, 201])
    if resp and resp.status_code in [200, 201]:
        try:
            quest = resp.json()
            if isinstance(quest, dict) and "id" in quest:
                created_ids["new_quest_id"] = quest["id"]
        except:
            pass
    
    # Create Dungeon
    dungeon_data = {"name": "Test Dungeon", "description": "Testing endpoint", "difficulty": "Medium"}
    resp = test_endpoint(group, "/dungeons", "POST", dungeon_data, [200, 201])
    if resp and resp.status_code in [200, 201]:
        try:
            dungeon = resp.json()
            if isinstance(dungeon, dict) and "id" in dungeon:
                created_ids["new_dungeon_id"] = dungeon["id"]
        except:
            pass
    
    # Create Trap
    trap_data = {"name": "Test Trap", "description": "Testing endpoint", "damage": "1d6"}
    resp = test_endpoint(group, "/traps", "POST", trap_data, [200, 201])
    if resp and resp.status_code in [200, 201]:
        try:
            trap = resp.json()
            if isinstance(trap, dict) and "id" in trap:
                created_ids["new_trap_id"] = trap["id"]
        except:
            pass
    
    # Create Encounter
    encounter_data = {"name": "Test Encounter", "description": "Testing endpoint", "difficulty": "Medium"}
    resp = test_endpoint(group, "/encounters", "POST", encounter_data, [200, 201])
    if resp and resp.status_code in [200, 201]:
        try:
            encounter = resp.json()
            if isinstance(encounter, dict) and "id" in encounter:
                created_ids["new_encounter_id"] = encounter["id"]
        except:
            pass
    
    # Create Player
    player_data = {"name": "Test Player", "class": "Wizard", "level": 5}
    resp = test_endpoint(group, "/players", "POST", player_data, [200, 201])
    if resp and resp.status_code in [200, 201]:
        try:
            player = resp.json()
            if isinstance(player, dict) and "id" in player:
                created_ids["new_player_id"] = player["id"]
        except:
            pass
    
    # ===== GROUP 5: Update Operations =====
    print("\nGROUP 5: Update Operations")
    print("-" * 80)
    group = "Group 5: Update Operations"
    
    # Update NPC (use newly created one or existing)
    if "new_npc_id" in created_ids:
        update_data = {"name": "Updated Test NPC"}
        test_endpoint(group, f"/npcs/{created_ids['new_npc_id']}", "PUT", update_data, [200, 201])
    elif "npc_id" in created_ids:
        update_data = {"name": "Updated NPC"}
        test_endpoint(group, f"/npcs/{created_ids['npc_id']}", "PUT", update_data, [200, 201])
    
    # Update Quest
    if "new_quest_id" in created_ids:
        update_data = {"name": "Updated Test Quest"}
        test_endpoint(group, f"/quests/{created_ids['new_quest_id']}", "PUT", update_data, [200, 201])
    elif "quest_id" in created_ids:
        update_data = {"name": "Updated Quest"}
        test_endpoint(group, f"/quests/{created_ids['quest_id']}", "PUT", update_data, [200, 201])
    
    # Update Dungeon
    if "new_dungeon_id" in created_ids:
        update_data = {"name": "Updated Test Dungeon"}
        test_endpoint(group, f"/dungeons/{created_ids['new_dungeon_id']}", "PUT", update_data, [200, 201])
    elif "dungeon_id" in created_ids:
        update_data = {"name": "Updated Dungeon"}
        test_endpoint(group, f"/dungeons/{created_ids['dungeon_id']}", "PUT", update_data, [200, 201])
    
    # Update Trap
    if "new_trap_id" in created_ids:
        update_data = {"name": "Updated Test Trap"}
        test_endpoint(group, f"/traps/{created_ids['new_trap_id']}", "PUT", update_data, [200, 201])
    elif "trap_id" in created_ids:
        update_data = {"name": "Updated Trap"}
        test_endpoint(group, f"/traps/{created_ids['trap_id']}", "PUT", update_data, [200, 201])
    
    # Update Encounter
    if "new_encounter_id" in created_ids:
        update_data = {"name": "Updated Test Encounter"}
        test_endpoint(group, f"/encounters/{created_ids['new_encounter_id']}", "PUT", update_data, [200, 201])
    
    # Update Player
    if "new_player_id" in created_ids:
        update_data = {"level": 6}
        test_endpoint(group, f"/players/{created_ids['new_player_id']}", "PUT", update_data, [200, 201])
    
    # ===== GROUP 6: Delete Operations =====
    print("\nGROUP 6: Delete Operations")
    print("-" * 80)
    group = "Group 6: Delete Operations"
    
    # Delete newly created items
    if "new_npc_id" in created_ids:
        test_endpoint(group, f"/npcs/{created_ids['new_npc_id']}", "DELETE", expected_codes=[200, 204])
    
    if "new_quest_id" in created_ids:
        test_endpoint(group, f"/quests/{created_ids['new_quest_id']}", "DELETE", expected_codes=[200, 204])
    
    if "new_dungeon_id" in created_ids:
        test_endpoint(group, f"/dungeons/{created_ids['new_dungeon_id']}", "DELETE", expected_codes=[200, 204])
    
    if "new_trap_id" in created_ids:
        test_endpoint(group, f"/traps/{created_ids['new_trap_id']}", "DELETE", expected_codes=[200, 204])
    
    if "new_encounter_id" in created_ids:
        test_endpoint(group, f"/encounters/{created_ids['new_encounter_id']}", "DELETE", expected_codes=[200, 204])
    
    if "new_player_id" in created_ids:
        test_endpoint(group, f"/players/{created_ids['new_player_id']}", "DELETE", expected_codes=[200, 204])
    
    # ===== GROUP 7: Player Nested Resources =====
    print("\nGROUP 7: Player Nested Resources")
    print("-" * 80)
    group = "Group 7: Player Nested Resources"
    
    # Use existing player or newly created
    player_id = created_ids.get("new_player_id")
    if not player_id:
        resp = test_endpoint(group, "/players", "GET")
        if resp and resp.status_code == 200:
            try:
                players = resp.json()
                if isinstance(players, list) and len(players) > 0:
                    player_id = players[0].get("id")
            except:
                pass
    
    if player_id:
        # Get player spells
        test_endpoint(group, f"/players/{player_id}/spells", "GET")
        
        # Get player weapons
        test_endpoint(group, f"/players/{player_id}/weapons", "GET")
        
        # Add spell to player (use first available spell)
        if "spell_id" in created_ids:
            spell_data = {"spell_id": created_ids["spell_id"], "prepared": False}
            test_endpoint(group, f"/players/{player_id}/spells", "POST", spell_data, [200, 201])
        
        # Add weapon to player (use first available weapon)
        resp = test_endpoint(group, "/weapons", "GET")
        if resp and resp.status_code == 200:
            try:
                weapons = resp.json()
                if isinstance(weapons, list) and len(weapons) > 0:
                    weapon_id = weapons[0].get("id")
                    if weapon_id:
                        weapon_data = {"weapon_id": weapon_id}
                        test_endpoint(group, f"/players/{player_id}/weapons", "POST", weapon_data, [200, 201])
            except:
                pass
    
    # ===== GROUP 8: Special Methods =====
    print("\nGROUP 8: Special Methods")
    print("-" * 80)
    group = "Group 8: Special Methods"
    
    # Get spell raw
    if "spell_id" in created_ids:
        test_endpoint(group, f"/spells/{created_ids['spell_id']}/raw", "GET", expected_codes=[200, 404])
    
    # ===== Summary Report =====
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80 + "\n")
    
    total_pass = 0
    total_fail = 0
    total_tests = 0
    
    for group_name in test_results:
        results = test_results[group_name]
        pass_count = sum(1 for r in results if r["status"] == "PASS")
        fail_count = sum(1 for r in results if r["status"] == "FAIL")
        total_count = len(results)
        
        total_pass += pass_count
        total_fail += fail_count
        total_tests += total_count
        
        percentage = (pass_count / total_count * 100) if total_count > 0 else 0
        print(f"{group_name}")
        print(f"  Tests: {total_count} | Pass: {pass_count} | Fail: {fail_count} | Success: {percentage:.1f}%")
        
        # Show failures
        failures = [r for r in results if r["status"] == "FAIL"]
        if failures:
            for failure in failures:
                print(f"    ✗ {failure['method']:6} {failure['endpoint']:30} [{failure['response_code']}]")
                if failure['details']:
                    print(f"      {failure['details']}")
        print()
    
    print("="*80)
    overall_percentage = (total_pass / total_tests * 100) if total_tests > 0 else 0
    print(f"OVERALL: {total_tests} tests | {total_pass} passed | {total_fail} failed")
    print(f"Success Rate: {overall_percentage:.1f}%")
    print("="*80)
    
    # Write JSON report
    report = {
        "timestamp": datetime.now().isoformat(),
        "base_url": BASE_URL,
        "total_tests": total_tests,
        "total_pass": total_pass,
        "total_fail": total_fail,
        "success_rate": overall_percentage,
        "groups": test_results,
        "created_ids": created_ids
    }
    
    with open("_dev/test_report_endpoints.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\nDetailed report saved to: _dev/test_report_endpoints.json")
    
    return total_fail == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
