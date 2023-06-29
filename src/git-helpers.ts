import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);

export async function runGitCommand(command: string): Promise<string> {
    try {
        const { stdout } = await exec(`git ${command}`);
        
        return stdout;
    } catch (error) {
        console.error(`exec error: ${error}`);
        
        throw error;
    }
}

export async function getDiffPairsExcludingMerges(previousHead: string, newHead: string): Promise<Array<[string, string]>> {
    // Get all commits between previousHead and newHead, including merge commits
    const logCommand = `log --pretty=format:"%H %P" ${previousHead}..${newHead}`;
    const logResult = await runGitCommand(logCommand);
    
    // Split the log output into lines
    const lines = logResult.split('\n');
    
    // Initialize an array to hold the diff pairs
    const diffPairs: Array<[string, string]> = [];
    
    // Initialize a variable to hold the previous non-merge commit hash
    let prevNonMergeHash = newHead;
    
    // Iterate over the lines in reverse order
    for (let i = lines.length - 1; i >= 0; i--) {
        // Split the line into words
        const words = lines[i].split(' ');
        
        // The commit hash is the first word
        const commitHash = words[0];
        
        // If the line has more than two words, it's a merge commit
        const isMergeCommit = words.length > 2;
        
        if (!isMergeCommit) {
            // This is a non-merge commit, so add a diff pair from this commit to the previous non-merge commit
            diffPairs.push([commitHash, prevNonMergeHash]);
            
            // Update the previous non-merge commit hash
            prevNonMergeHash = commitHash;
        }
    }
    
    // Add a diff pair from previousHead to the last non-merge commit
    diffPairs.push([previousHead, prevNonMergeHash]);
    
    return diffPairs;
}

export async function getDiffExcludingMerges(previousHead: string, newHead: string): Promise<string | null> {
    // Get the diff pairs excluding merges
    const diffPairs = await getDiffPairsExcludingMerges(previousHead, newHead);
    
    // Initialize a variable to hold the full diff
    let fullDiff = '';
    
    // Iterate over the diff pairs
    for (const [fromHash, toHash] of diffPairs) {
        // Get the diff between the two hashes
        const diffCommand = `diff ${fromHash} ${toHash}`;
        const diffResult = await runGitCommand(diffCommand);
        
        // Add the diff to the full diff
        fullDiff += diffResult;
    }
    
    // If the full diff is empty, return null
    if (fullDiff.trim() === '') {
        return null;
    }
    
    // Otherwise, return the full diff
    return fullDiff;
}
