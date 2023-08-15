/**
 * Valorant Stats Tracker by Ethan. 
 * This is a simple player lookup website built ontop of henrikdev's API.
 * All credit goes to henrikdev for the API.
 */

//Base api endpoints
const mmrURL = "https://api.henrikdev.xyz/valorant/v1/mmr/";
const matchHistURL = "https://api.henrikdev.xyz/valorant/v3/matches/";
const playerInfoURL = "https://api.henrikdev.xyz/valorant/v1/account/";
/**
 * Sleeps for a time in ms
 * @param {ms} - The time in ms
 * @returns setTimeout promise: resolves in requested time.
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



/**
 * Search player
 * @param {*} name - The player's name
 * @param {*} tag  - The player's tag.
 * @returns - nada
 */
async function searchPlayer(name, tag) {


    //Normalize name.
    var ign = name;
    name = name.replace(" ", "%20");


    if (!name || !tag) {

        console.log("err");
        document.getElementById("rankText").innerHTML = `Error: You gotta add a name#tag.`;

        document.getElementById("rankInfoCard").style.animation = "slideIn 4s ease 0s 1 normal forwards";

        document.getElementById("search").innerHTML = "Search";
        return;
    }
    const O = '{"games":0,"wins":0,"K":0,"D":0,"A":0,"bestKD":-1,"bestK":0,"bestD":0,"bestA":0,"wonBestMatch":false}'
    //My simple object to store the data.
    var data = { "Metadata": { "Name": "", "Rank": "" }, "Unrated": JSON.parse(O), "Competitive": JSON.parse(O), "Deathmatch": JSON.parse(O), "Spike Rush": JSON.parse(O), "Replication": JSON.parse(O), "Escalation": JSON.parse(O) };



    var puuid = "";
    var region = "";
    var playerCardImSrc = "";
    var playerLevel = "";
    /**
     * Call the account info API to get:
     * Background Card
     * region
     * account level
     * puuid(so this still works after a recent name change)
     */
    fetch(playerInfoURL + name + "/" + tag, {
        headers: {
            "Content-Type": "text/plain"
        }
    }).then((promiseplayerInfo) => {
        /**
         * Try to resolve the promise as a JSON object.
         * TODO: Add Catch if cannot resolve.
         */
        promiseplayerInfo.json().then((playerInfo) => {
            /**
            * If we cant find player, say that and break.
            */
            if (playerInfo.status != 200) {
                console.log(`ERROR in API/fetch(playerInfoUrl...): Failed to find player named ${name}#${tag}`);
                document.getElementById("rankText").innerHTML = `Error: Failed to find player named ${name}#${tag}`;

                document.getElementById("rankInfoCard").style.animation = "slideIn 1s linear 0s 1 normal forwards";
                document.getElementById("rankInfoOutside").style.animation = "slideIn 1s linear 0s 1 normal forwards";
                document.getElementById("search").innerHTML = "Search";
                return;
            }
            /**
             * Get puuid, region, card picture
             */
            puuid = playerInfo["data"]["puuid"];
            region = playerInfo["data"]["region"];
            playerCardImSrc = playerInfo["data"]["card"]["wide"];
            playerLevel = playerInfo["data"]["account_level"];
        }).then(() => {
            /**
             * Get player's competitive rank and rank picture.
             */
            fetch(mmrURL + region + "/" + name + "/" + tag, {
                headers: {
                    "Content-Type": "text/plain"
                }
            }).then((promiseMMR) => {

                promiseMMR.json().then((mmrdata) => {
                    if (mmrdata.status != 200) {
                        console.log(`ERROR in fetch(mmrURL...): Failed to find player named ${name}#${tag}`);
                        document.getElementById("rankText").innerHTML = `Error: Failed to find player named ${name}#${tag}`;

                        document.getElementById("rankInfoCard").style.animation = "slideIn 1s linear 0s 1 normal forwards";
                        document.getElementById("rankInfoOutside").style.animation = "slideIn 1s linear 0s 1 normal forwards";
                        document.getElementById("search").innerHTML = "Search";
                        return;
                    }



                    let rank = mmrdata["data"]["currenttierpatched"];
                    let rankName, rankImsrc;

                    if (rank == null) {
                        rankName = "Unranked";
                        rankImsrc = "https://static.wikia.nocookie.net/valorant/images/b/b2/TX_CompetitiveTier_Large_0.png";
                    } else {
                        rankName = rank;
                        rankImsrc = mmrdata["data"]["images"]["small"];
                    }
                    /**
                     * render the rank card div with the competive rank, background picture, and player level
                     */
                    addRankCard(rankName, rankImsrc, playerCardImSrc, playerLevel);


                });

            });
            /**
             * Get game data for previous 5 games of each category.
             * I actually really dont like dealing with error handling in prommise chains, so I'm going to apply this "Temporary fix"
             */
            if (region !== "") {
                let categories = ["escalation", "spikerush", "deathmatch", "competitive", "unrated", "replication"]
                for (gamemode of categories) {
                    fetch(matchHistURL + region + "/" + name + "/" + tag + "?filter=" + gamemode, {
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    }).then((gamesPromise) => {
                        gamesPromise.json().then((games) => {
                            /**
                             * Games is a JSON object with {status,data}
                             * data is an array of the last 5 matches and contains extensive info about the map, game time, and each purchase, 
                             * death time/location, and much more. This tracker doesn't even come close to full data utilization yet. 
                             * (TODO: Add Option to view more information about each round.)
                             */
                            //Keeping this console log in here for future debugging and development.
                            console.log(games);
                            games = games["data"];
                            //Check for undefined
                            if (games) {


                                let thisK, thisD, thisA;
                                for (let i = 0; i < games.length; i++) {
                                    //This line is unnescecary, but rather than refactoring, I will assert my knowledge in this comment.
                                    if("metadata" in games[i]){
                                        let mode = games[i]["metadata"]["mode"];
                                        //This breaks for custom games. Plus I dont store any info about them.
                                        if (mode != "Custom Game") {
    
    
                                            let winTeam = (games[i]["teams"]["red"]["has_won"] ? "Red" : "Blue");
                                            data[mode]["games"] += 1;
    
                                            let players = games[i]["players"]["all_players"];
                                            //Get the searched player from the list of players. Search by PUUID in case of recent name change
                                            let searchedPlayer = players.filter(p => p["puuid"] == puuid)[0];
                                            //If player is on the win team, add 1 to wins. Currently counts draw as a win.
                                            //TODO: Check for draws
                                            
                                            thisK = parseInt(searchedPlayer["stats"]["kills"]);
                                            thisD = parseInt(searchedPlayer["stats"]["deaths"]);
                                            thisA = parseInt(searchedPlayer["stats"]["assists"]);
                                            //Divide by zero error but lets be real youre gonna get 1 tapped at least once. 
                                            //TODO: Fix divide by zero error.
                                            data[mode]["K"] += thisK;
                                            data[mode]["D"] += thisD;
                                            data[mode]["A"] += thisA;
                                            if (searchedPlayer["team"] == winTeam||mode.toLowerCase()=="deathmatch"&&thisK>=40) {
                                                data[mode]["wins"] += 1
                                            }
                                            if (thisK / thisD > data[mode]["bestKD"]) {
                                                data[mode]["bestKD"] = thisK / thisD;
                                                data[mode]["bestK"] = thisK;
                                                data[mode]["bestD"] = thisD;
                                                data[mode]["bestA"] = thisA;
    
                                                data[mode]["wonBestMatch"] = (mode.toLowerCase() == "deathmatch" && (thisK >= 40)) || (searchedPlayer["team"] == winTeam);
                                            }
    
                                        }
                                    }
                                    
                                }
                            }
                            //Replication is the last mode. Call PageEventHandler/fillDivs to display the information.
                            if (gamemode == "replication") {
                                fillDivs(data);
                            }

                        });
                    });
                }
            }

        })
    })




}




